import express from "express";
import { load } from "cheerio";
import OpenAI from "openai";
import crypto from "crypto";

const PORT = process.env.PORT || 3000;

const TEST_CREDENTIALS = {
  username: "demo",
  password: "opensesame"
};

const activeTokens = new Set();

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

function extractToken(req) {
  const authHeader = req.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({
      error: "Unauthorized. Please log in again."
    });
  }

  req.token = token;
  next();
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    username.trim() !== TEST_CREDENTIALS.username ||
    password !== TEST_CREDENTIALS.password
  ) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const token = crypto.randomUUID();
  activeTokens.add(token);

  res.json({
    token,
    message: "Login successful."
  });
});

app.post("/api/logout", (req, res) => {
  const token = extractToken(req);

  if (!token) {
    return res
      .status(400)
      .json({ error: "A valid authorization token is required to log out." });
  }

  if (activeTokens.delete(token)) {
    return res.json({ success: true });
  }

  return res.status(400).json({ error: "The provided session is not active." });
});

app.post("/api/analyze", requireAuth, async (req, res) => {
  const { url } = req.body ?? {};

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not set on the server."
    });
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "A valid 'url' field is required." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return res.status(400).json({ error: "Please provide a valid URL." });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "TermsRiskAnalyzer/1.0"
      }
    });

    if (!response.ok) {
      return res.status(502).json({
        error: `Failed to retrieve the page (status ${response.status}).`
      });
    }

    const html = await response.text();
    const $ = load(html);
    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return res.status(422).json({
        error: "Unable to extract readable text from the provided URL."
      });
    }

    const maxLength = 12000;
    const trimmed = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages = [
      {
        role: "system",
        content:
          "You are a legal expert specializing in highlighting risks hidden in online Terms and Conditions. Provide cautious, user-friendly explanations."
      },
      {
        role: "user",
        content: `Review the following Terms and Conditions text and identify any clauses that could pose risks to an everyday user. Prioritize limitations of liability, data sharing, subscription traps, automatic renewals, arbitration clauses, jurisdiction changes, and any unusual obligations.\n\nSummarize the most important findings in markdown with clear section headings for:\n- Overall Risk Summary\n- Highest-Risk Clauses\n- Medium-Risk Clauses\n- Notable User Rights or Protections\n\nFor each clause you highlight, include a short quote (at most 30 words) from the terms to justify your point. Use bullet lists where possible.\n\nHere is the text to analyze:\n\n${trimmed}`
      }
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return res.status(502).json({
        error: "The analysis could not be generated. Please try again."
      });
    }

    res.json({ result: content });
  } catch (error) {
    console.error("Analysis error", error);
    res.status(500).json({
      error: "An unexpected error occurred while analyzing the terms.",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Terms risk analyzer running on http://localhost:${PORT}`);
});
