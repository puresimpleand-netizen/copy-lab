// Vercel serverless function: proxies requests to Google's Gemini API.
// Keeps GEMINI_API_KEY server-side so it's never exposed to the browser,
// and avoids any CORS/CSP issues that come from calling the API directly
// from client-side JS.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it in Vercel project settings." });
    return;
  }

  const { system, messages, max_tokens } = req.body || {};

  if (!messages || !messages[0]?.content) {
    res.status(400).json({ error: "Missing 'messages' in request body." });
    return;
  }

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system || "" }] },
          contents: [{ role: "user", parts: [{ text: messages[0].content }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: max_tokens || 1000 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data?.error?.message || "Gemini API error." });
      return;
    }

    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");

    // Return in the same shape App.jsx already expects from callClaude
    res.status(200).json({ content: [{ text }] });
  } catch (err) {
    res.status(500).json({ error: "Proxy request failed: " + err.message });
  }
}
