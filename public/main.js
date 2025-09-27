const form = document.getElementById("analyze-form");
const urlInput = document.getElementById("terms-url");
const statusEl = document.getElementById("status");
const analysisEl = document.getElementById("analysis");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = urlInput.value.trim();

  if (!url) {
    setStatus("Please enter a URL to analyze.", true);
    return;
  }

  setStatus("Fetching the Terms & Conditions and asking OpenAI for insights...");
  analysisEl.innerHTML = "";
  form.querySelector("button").disabled = true;

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unknown error");
    }

    setStatus("Analysis complete.");
    analysisEl.innerHTML = marked.parse(data.result);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong. Please try again.", true);
  } finally {
    form.querySelector("button").disabled = false;
  }
});
