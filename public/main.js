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

let authToken = localStorage.getItem(TOKEN_KEY) ?? "";

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
}

function handleUnauthorized(message = "Your session expired. Please sign in again.") {
  authToken = "";
  localStorage.removeItem(TOKEN_KEY);
  showLogin(message, true);
}

if (authToken) {
  showApp();
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
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
});
