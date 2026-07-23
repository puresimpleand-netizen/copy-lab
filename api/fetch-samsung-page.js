// Vercel serverless function: fetches a Samsung.com page server-side (no CORS issue
// since this runs on the server, not the browser) and extracts readable text for use
// as source material when drafting/revising disclaimers.
//
// Restricted to samsung.com domains on purpose — this isn't a general-purpose scraper,
// it's specifically for pulling context from Samsung product/marketing pages.
//
// Honest limitation: this is a plain server-side fetch of the page's initial HTML.
// It won't execute JavaScript, so content that only renders client-side (common on
// heavily dynamic pages) may not appear in the extracted text. It can also get blocked
// by bot detection — if that happens, the caller should fall back to letting the user
// paste the page content manually.

const ALLOWED_HOST_SUFFIX = ".samsung.com";
const ALLOWED_EXACT_HOST = "samsung.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { url } = req.body || {};
  if (!url || !url.trim()) {
    res.status(400).json({ error: "Missing 'url' in request body." });
    return;
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    res.status(400).json({ error: "That doesn't look like a valid URL." });
    return;
  }

  const host = parsed.hostname.toLowerCase();
  const isAllowed = host === ALLOWED_EXACT_HOST || host.endsWith(ALLOWED_HOST_SUFFIX);
  if (!isAllowed) {
    res.status(400).json({ error: "Only samsung.com URLs are supported for page context (e.g. samsung.com/us/..., samsung.com/uk/...)." });
    return;
  }

  try {
    const pageRes = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CIGCopyAI/1.0; +internal-tool)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!pageRes.ok) {
      res.status(502).json({ error: `Samsung.com returned ${pageRes.status} — the page may block automated requests, or the URL may be wrong.` });
      return;
    }

    const html = await pageRes.text();

    // Strip script/style blocks, then tags, then collapse whitespace.
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&rsquo;/g, "'")
      .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 100) {
      res.status(422).json({ error: "Fetched the page but couldn't extract meaningful text — it may be a JavaScript-rendered page. Try pasting the relevant content manually instead." });
      return;
    }

    // Cap length to keep the downstream prompt reasonable.
    const trimmed = text.length > 12000 ? text.slice(0, 12000) + " …[truncated]" : text;

    res.status(200).json({ text: trimmed, url: parsed.toString() });
  } catch (err) {
    res.status(502).json({ error: "Couldn't reach that page (network error or blocked): " + err.message });
  }
}
