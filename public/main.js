const TOKEN_KEY = "tra-auth-token";

const form = document.getElementById("analyze-form");
const urlInput = document.getElementById("terms-url");
const statusEl = document.getElementById("status");
const analysisEl = document.getElementById("analysis");
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const loginForm = document.getElementById("login-form");
const loginStatusEl = document.getElementById("login-status");
const logoutButton = document.getElementById("logout-button");
const historyListEl = document.getElementById("history-list");
const historyEmptyEl = document.getElementById("history-empty");

let authToken = localStorage.getItem(TOKEN_KEY) ?? "";
let historyItems = [];

function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderHistory() {
  if (!historyListEl || !historyEmptyEl) return;

  historyListEl.innerHTML = "";

  if (!historyItems.length) {
    historyEmptyEl.classList.remove("hidden");
    return;
  }

  historyEmptyEl.classList.add("hidden");

  for (const item of historyItems) {
    const li = document.createElement("li");
    li.className = "history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-button";
    button.dataset.historyId = item.id;

    const title = document.createElement("div");
    title.textContent = formatHistoryTitle(item.url);

    const meta = document.createElement("div");
    meta.className = "history-meta";
    meta.textContent = formatHistoryTimestamp(item.analyzedAt);

    button.append(title, meta);
    li.append(button);
    historyListEl.append(li);
  }
}

function formatHistoryTitle(url) {
  if (!url) {
    return "Unknown policy";
  }

  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const display = `${parsed.hostname}${path}`;
    return display.length > 60 ? `${display.slice(0, 57)}…` : display;
  } catch (error) {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

function formatHistoryTimestamp(timestamp) {
  if (!timestamp) return "Unknown time";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function setHistory(items) {
  historyItems = Array.isArray(items) ? items : [];
  renderHistory();
}

function upsertHistoryItem(item) {
  if (!item || !item.id) return;
  const filtered = historyItems.filter((entry) => entry.id !== item.id);
  historyItems = [item, ...filtered];
  if (historyItems.length > 10) {
    historyItems.length = 10;
  }
  renderHistory();
}

function setLoginStatus(message = "", isError = false) {
  if (!loginStatusEl) return;
  loginStatusEl.textContent = message;
  loginStatusEl.classList.toggle("error", isError);
}

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function showApp() {
  loginSection?.classList.add("hidden");
  appSection?.classList.remove("hidden");
  setLoginStatus("");
  setStatus("Paste the Terms & Conditions URL to begin.");
}

function showLogin(message = "", isError = false) {
  loginSection?.classList.remove("hidden");
  appSection?.classList.add("hidden");
  if (message) {
    setLoginStatus(message, isError);
  } else {
    setLoginStatus("Use the demo credentials above to sign in.");
  }
  form?.reset();
  if (analysisEl) {
    analysisEl.innerHTML = "";
  }
  setStatus("");
  setHistory([]);
}

function handleUnauthorized(message = "Your session expired. Please sign in again.") {
  authToken = "";
  localStorage.removeItem(TOKEN_KEY);
  showLogin(message, true);
}

if (authToken) {
  showApp();
  refreshHistory();
} else {
  showLogin();
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = formData.get("username")?.toString().trim();
  const password = formData.get("password")?.toString() ?? "";

  if (!username || !password) {
    setLoginStatus("Please provide both a username and password.", true);
    return;
  }

  setLoginStatus("Signing you in...");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to sign in.");
    }

    authToken = data.token;
    localStorage.setItem(TOKEN_KEY, authToken);
    setLoginStatus("Login successful!");
    showApp();
    await refreshHistory();
  } catch (error) {
    console.error(error);
    setLoginStatus(error.message || "Unable to sign in.", true);
  }
});

logoutButton?.addEventListener("click", async () => {
  if (!authToken) {
    showLogin();
    return;
  }

  try {
    await fetch("/api/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
  } catch (error) {
    console.error(error);
  } finally {
    handleUnauthorized("You have been signed out.");
  }
});

async function refreshHistory() {
  if (!authToken || !historyListEl) return;

  try {
    const response = await fetch("/api/history", {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    const data = await response.json();
    if (Array.isArray(data.history)) {
      setHistory(data.history);
    } else {
      setHistory([]);
    }
  } catch (error) {
    console.error(error);
  }
}

historyListEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest("button[data-history-id]");
  if (!button) return;

  const { historyId } = button.dataset;
  if (!historyId) return;

  const item = historyItems.find((entry) => entry.id === historyId);
  if (!item) return;

  if (analysisEl) {
    analysisEl.innerHTML = marked.parse(item.result ?? "");
  }
  setStatus(`Showing saved analysis from ${formatHistoryTimestamp(item.analyzedAt)}.`);
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!authToken) {
    handleUnauthorized();
    return;
  }

  const url = urlInput?.value.trim();

  if (!url) {
    setStatus("Please enter a URL to analyze.", true);
    return;
  }

  setStatus("Fetching the Terms & Conditions and asking OpenAI for insights...");
  if (analysisEl) {
    analysisEl.innerHTML = "";
  }

  const submitButton = form.querySelector("button[type='submit']");
  if (submitButton) {
    submitButton.disabled = true;
  }

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      throw new Error(data.error || "Unknown error");
    }

    setStatus("Analysis complete.");
    if (analysisEl) {
      analysisEl.innerHTML = marked.parse(data.result);
    }
    if (data.analysis) {
      upsertHistoryItem(data.analysis);
    } else {
      upsertHistoryItem({
        id: generateId(),
        url,
        analyzedAt: new Date().toISOString(),
        result: data.result
      });
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});
