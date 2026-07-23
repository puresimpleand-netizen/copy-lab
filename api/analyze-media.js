// Vercel serverless function: multimodal Gemini calls for image and video alt text.
// Kept separate from api/generate.js (which only ever sends plain text) so this more
// complex, higher-risk path can't affect the working text-only tabs if something here
// breaks or Google changes multimodal request shapes.
//
// Image mode: sends inline base64 image data + a prompt.
// Video mode: sends a public YouTube URL directly via fileData (no download needed) —
// this is a real, documented Gemini capability, not a workaround. Constraints that
// apply here and are surfaced to the caller on failure: video must be PUBLIC (not
// private/unlisted), and the free tier caps total YouTube video processed per day.

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

  const { mode, prompt, imageBase64, imageMimeType, videoUrl, maxTokens } = req.body || {};

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: "Missing 'prompt' in request body." });
    return;
  }

  let parts;
  if (mode === "image") {
    if (!imageBase64 || !imageMimeType) {
      res.status(400).json({ error: "Missing image data." });
      return;
    }
    parts = [
      { inlineData: { mimeType: imageMimeType, data: imageBase64 } },
      { text: prompt },
    ];
  } else if (mode === "video") {
    if (!videoUrl || !videoUrl.trim()) {
      res.status(400).json({ error: "Missing 'videoUrl' in request body." });
      return;
    }
    parts = [
      { fileData: { fileUri: videoUrl.trim() } },
      { text: prompt },
    ];
  } else {
    res.status(400).json({ error: "Invalid 'mode' — must be 'image' or 'video'." });
    return;
  }

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens || 2000 },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      res.status(geminiRes.status).json({ error: data?.error?.message || "Gemini API error." });
      return;
    }

    if (data.promptFeedback?.blockReason) {
      res.status(422).json({ error: `Blocked before generating (reason: ${data.promptFeedback.blockReason}).` });
      return;
    }

    const candidate = data.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const text = (candidate?.content?.parts || []).map(p => p.text || "").join("");

    if (!text.trim()) {
      if (finishReason === "SAFETY" || finishReason === "RECITATION") {
        res.status(422).json({ error: `Response was blocked (reason: ${finishReason}).` });
        return;
      }
      if (mode === "video") {
        res.status(422).json({ error: `Couldn't process that video (finish reason: ${finishReason || "unknown"}). Make sure it's a public YouTube video, not private or unlisted.` });
        return;
      }
      res.status(422).json({ error: `Gemini returned an empty response (finish reason: ${finishReason || "unknown"}).` });
      return;
    }

    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: "Request failed: " + err.message });
  }
}
