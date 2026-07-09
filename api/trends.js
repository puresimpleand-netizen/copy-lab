// Vercel serverless function: fetches real "related queries" (including rising/trending
// searches) from Google Trends for a given keyword, using the unofficial google-trends-api
// package. This scrapes Google's internal Trends endpoints — it is NOT an official Google
// API, has no SLA, and can break or get rate-limited without notice. We fail soft: if this
// errors out, the calling tab should just omit the trends section rather than blocking the
// rest of the report.

import googleTrends from "google-trends-api";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { keyword, geo } = req.body || {};
  if (!keyword || !keyword.trim()) {
    res.status(400).json({ error: "Missing 'keyword' in request body." });
    return;
  }

  try {
    const raw = await googleTrends.relatedQueries({
      keyword: keyword.trim(),
      geo: geo || "US",
      hl: "en-US",
    });

    const parsed = JSON.parse(raw);
    const rankedList = parsed?.default?.rankedList || [];

    // rankedList[0] = "Top" queries, rankedList[1] = "Rising" queries (closest to "trending now")
    const rising = (rankedList[1]?.rankedKeyword || []).slice(0, 8).map(item => ({
      query: item.query,
      value: item.formattedValue || String(item.value),
    }));
    const top = (rankedList[0]?.rankedKeyword || []).slice(0, 8).map(item => ({
      query: item.query,
      value: item.formattedValue || String(item.value),
    }));

    res.status(200).json({ rising, top });
  } catch (err) {
    res.status(502).json({ error: "Google Trends lookup failed (unofficial endpoint — may be rate-limited or temporarily unavailable): " + err.message });
  }
}
