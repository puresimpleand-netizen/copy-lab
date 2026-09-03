import { useState } from "react";

const SENTENCE_CASE_RULE = "Grammar rule: use sentence case for all copy — capitalize only the first word and proper nouns, never Title Case.";

const API_URL = "/api/generate";
const TRENDS_API_URL = "/api/trends";

// The 4 alt-text styles the user picks from in Step 3. Each maps to a
// distinct writing instruction the model follows — replaces the earlier
// auto-classification/variant approach with an explicit, predictable choice.
const ALT_TEXT_STYLES = [
  { value: "descriptive", label: "Descriptive", description: "Detailed description of what's visible in the image", guidance: "Write a thorough, detailed description of what's visible and relevant in the image — more comprehensive than a typical short alt text. Still stay accurate and avoid filler; every detail included should be genuinely useful to someone who can't see the image." },
  { value: "seo", label: "SEO-Optimized", description: "Includes relevant keywords for search engine optimization", guidance: "Naturally work relevant SEO keywords into the alt text itself, without keyword-stuffing or hurting readability — the alt text must still accurately describe the image first and read naturally; keywords are secondary to accuracy." },
  { value: "accessibility", label: "Accessibility-Focused", description: "Optimized for screen readers, concise and clear", guidance: "Optimize purely for screen-reader usability: concise, clear, functional language. Describe only what's functionally important, and avoid decorative or subjective adjectives (e.g. \"stunning,\" \"sleek\") that don't aid understanding." },
  { value: "concise", label: "Concise", description: "Brief, to-the-point description under 50 characters", guidance: "Keep the alt text strictly under 50 characters — the shortest accurate description possible. Cut anything not essential." },
];

async function fetchTrendingKeywords(keyword) {
  if (!keyword || !keyword.trim()) return null;
  try {
    const res = await fetch(TRENDS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: keyword.trim(), geo: "US" }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return data;
  } catch {
    return null;
  }
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 2000) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("PARSE_ERROR: the AI's response wasn't valid JSON. This usually means either the brief was too vague to work with (try adding a product name, feature, or goal) or too long and got cut off (try trimming it down). Give it another try.");
  }
}

function describeError(e) {
  const msg = (e && e.message) || "";
  if (msg.startsWith("PARSE_ERROR")) return msg.replace("PARSE_ERROR: ", "");
  if (msg) return msg;
  return "Something went wrong. Try again in a moment.";
}

// Shared JSON parser for model responses. Model output occasionally comes back
// truncated (token limit hit mid-string) or with an unescaped literal newline
// inside a long text field, both of which break JSON.parse with a bare
// "Unterminated string" error — this wraps that into a clearer message.
function parseModelJson(rawText) {
  const clean = rawText.replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("PARSE_ERROR: the AI's response got cut off or came back malformed. This is usually a truncated response — try again, or shorten the context/description if it keeps happening.");
  }
}

function Field({ label, hint, required, children }) {
  return (
    <div className="cl-field" style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 0", minWidth: 0 }}>
        <label style={labelStyle}>{label} {required && <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#C8401A" }}>(required)</span>}</label>
        {children}
      </div>
      {hint && (
        <div className="cl-field-hint" style={{ flex: "1 1 0", minWidth: 0, paddingTop: 27 }}>
          <p style={{ fontSize: 12, color: "#9A9590", lineHeight: 1.55, margin: 0 }}>{hint}</p>
        </div>
      )}
    </div>
  );
}

function Pill({ type, children }) {
  const s = type === "flag"
    ? { bg: "#FFF0EC", border: "#C8401A25", text: "#A63315", dot: "#C8401A" }
    : { bg: "#F0FBF5", border: "#1E7A4820", text: "#1A5C38", dot: "#1E7A48" };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 13px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, marginBottom: 7 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, marginTop: 6, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: s.text, fontFamily: "'DM Sans', sans-serif", margin: 0, lineHeight: 1.55 }}>{children}</p>
    </div>
  );
}

// Search volume is a qualitative tier (High/Medium/Low) rather than a
// fabricated precise number, since this tool has no real search volume API —
// presenting a made-up number as if it were data would be misleading.
function VolumeRow({ keyword, volume, note }) {
  const colors = { High: "#1E7A48", Medium: "#C07820", Low: "#8A8580" };
  const color = colors[volume] || "#8A8580";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid #EEEAE2" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1915", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{keyword}</p>
        {note && <p style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.5, margin: "3px 0 0" }}>{note}</p>}
      </div>
      <span style={{ flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: 10.5, fontWeight: 600, color, background: color + "15", border: `1px solid ${color}30`, borderRadius: 4, padding: "3px 8px", letterSpacing: "0.03em", textTransform: "uppercase" }}>{volume || "—"} vol.</span>
    </div>
  );
}

function TrendingKeywordsPanel({ keyword, data }) {
  if (!keyword?.trim()) return null;
  const trendsUrl = `https://trends.google.com/explore?geo=US&hl=en-US&q=${encodeURIComponent(keyword.trim())}`;
  const rising = data?.rising || [];
  const top = data?.top || [];
  const list = rising.length ? rising : top;

  return (
    <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590" }}>
          {rising.length ? "Trending Now" : "Related Searches"} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Google Trends, based on "{keyword}")</span>
        </p>
        <a href={trendsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#C8401A", fontFamily: "'DM Mono', monospace", textDecoration: "none" }}>View on Trends ↗</a>
      </div>
      {list.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {list.map((item, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 20, fontSize: 12, color: "#1A5C38" }}>
              {item.query}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#1E7A48", opacity: 0.7 }}>{item.value}</span>
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: "#B0ABA4", lineHeight: 1.5 }}>Trending data unavailable right now (Google Trends is an unofficial, rate-limited source) — check the live page instead.</p>
      )}
    </div>
  );
}

const inputBase = {
  width: "100%", padding: "13px 14px",
  background: "#F9F7F3", border: "1.5px solid #E0DBD2",
  borderRadius: 8, fontFamily: "'DM Sans', sans-serif",
  fontSize: 15, color: "#1C1915", outline: "none",
  boxSizing: "border-box", lineHeight: 1.55,
};

const labelStyle = {
  display: "block", fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700, fontSize: 12.5, letterSpacing: "0.01em",
  textTransform: "none", color: "#6B665F", marginBottom: 8,
};

function highlightText(text, keywordTerms = [], benefitTerms = []) {
  if (!text) return text;
  const terms = [
    ...keywordTerms.filter(Boolean).map(t => ({ term: t.trim(), type: "keyword" })),
    ...benefitTerms.filter(Boolean).map(t => ({ term: t.trim(), type: "benefit" })),
  ].filter(t => t.term.length > 1);
  if (!terms.length) return text;

  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(${sorted.map(t => escape(t.term)).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const match = sorted.find(t => t.term.toLowerCase() === part.toLowerCase());
    if (!match) return part;
    const isKeyword = match.type === "keyword";
    return (
      <mark key={i} style={{
        background: isKeyword ? "#DFF5E8" : "#E4EBFF",
        color: isKeyword ? "#1A5C38" : "#2A3D80",
        padding: "1px 3px", borderRadius: 3, fontWeight: 600,
      }}>{part}</mark>
    );
  });
}

// Numbered step wrapper used across the 3-step flow, matching the reference
// layout: a small "Step N" label, a bold title, then the step's content.
function StepBlock({ number, title, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C8401A", margin: 0 }}>Step {number}</p>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "#1C1915", margin: "3px 0 0" }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

// Selectable style-preset card for Step 3.
function StyleCard({ style, active, onClick }) {
  return (
    <button onClick={onClick} type="button" style={{
      textAlign: "left", padding: "13px 15px", borderRadius: 8, cursor: "pointer",
      border: `1.5px solid ${active ? "#C8401A" : "#E0DBD2"}`,
      background: active ? "#FFF3EE" : "#F9F7F3",
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13.5, color: active ? "#A63315" : "#1C1915" }}>{style.label}</span>
      <span style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.45 }}>{style.description}</span>
    </button>
  );
}

// SEO keywords report an estimated search-volume tier instead of a
// fabricated precise number (no real search-volume API backs this tool).
// Benefits are the model's own judgment of what's genuinely true and visible.
const SEO_BENEFITS_INSTRUCTION = `
Also, without being asked for specific terms, use your own judgment to identify:
- "seo_keywords": 3-6 realistic SEO keywords/phrases this content is well-suited to rank for or that a shopper would plausibly search for related to it — grounded in what's actually shown/described, not invented. For each, estimate its relative search volume as "search_volume": "High", "Medium", or "Low" (a qualitative estimate, not a fabricated precise number), plus a "note" of 1 short phrase on why.
- "benefits_highlighted": any functional benefits or purposes this media conveys (per WCAG guidance to describe function over pure appearance) — short phrases, only ones genuinely true to the content, empty array if none apply.`;

const SEO_BENEFITS_SCHEMA = `"seo_keywords":[{"keyword":"","search_volume":"High","note":""}],"benefits_highlighted":[]`;

// Precision guidance from internal review feedback: the generator was
// merging visually-similar-but-distinct items (e.g. two similar phone colors
// counted as one device) and using vague/decorative language instead of exact
// feature or color names. Guessing at official/marketing color names turned
// out unreliable (came back different from the actual product page), so
// colors are described plainly and accurately instead of guessed as a
// specific named colorway. Also folds in Samsung's A09/A10 anti-patterns
// (verbose alt text, filler phrases like "image of") as always-on rules.
const PRECISION_INSTRUCTION = `
Before writing, carefully count every distinct object, device, or person visible — look closely for subtle differences (e.g. two similar-looking colors on the same device model are likely different colorways, not the same unit) and treat each visually distinct unit as its own item, even when the difference is subtle. Do this silently as part of writing accurately — you don't need to report the count separately.
Describe colors plainly and accurately based on what's actually visible (e.g. "dark blue," "white") — do not guess at or invent a specific official/marketing color name, since that can't be verified from the image alone and may not match the actual product name.
Use precise, correct feature/function names rather than vague or invented ones. Avoid unnecessary decorative or subjective language (e.g. "stunning," "sleek") that doesn't serve accessibility — keep descriptions functional and accurate, and leave out details that aren't useful for someone who can't see the media.
Per Samsung accessibility guidelines, always avoid: verbose alt text that over-explains or narrates rather than staying concise (this applies especially to images describing a mobile device's function); and filler phrases like "image of," "picture of," or "graphic of" — screen readers already announce that an image is present, so naming it again is redundant.`;

// Appended to every prompt that expects raw JSON back. Long free-text fields
// (long_description, transcript_captions) are the most common source of
// invalid JSON, since a stray literal newline or unescaped quote inside them
// breaks the parser — this tells the model explicitly how to avoid that.
const JSON_VALIDITY_INSTRUCTION = `
Your entire reply must be a single valid JSON object and nothing else — no markdown fences, no preamble or sign-off. Inside every string value: escape any newline as \\n (never a raw line break), escape any double quote as \\", and do not truncate — if a field would run long, keep it concise enough to finish within the response instead of cutting off mid-sentence.`;

function buildStyleInstruction(styleInfo) {
  return `
Alt text style: "${styleInfo.label}" — ${styleInfo.guidance}`;
}

export default function CopyLab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(null);

  const [altMode, setAltMode] = useState("image"); // "image" | "video"
  const [altImageFile, setAltImageFile] = useState(null);
  const [altImagePreview, setAltImagePreview] = useState("");
  const [altImageBase64, setAltImageBase64] = useState("");
  const [altImageMimeType, setAltImageMimeType] = useState("");
  const [altImageDescription, setAltImageDescription] = useState(""); // fallback when image can't be uploaded (confidential)
  const [altContext, setAltContext] = useState("");
  const [altYoutubeUrl, setAltYoutubeUrl] = useState("");
  const [altStyle, setAltStyle] = useState("descriptive");

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAltImageFile = (file) => {
    if (!file) return;
    setAltImageFile(file);
    setAltImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAltImagePreview(dataUrl);
      setAltImageBase64(dataUrl.split(",")[1] || "");
    };
    reader.readAsDataURL(file);
  };

  const clearAltImage = () => {
    setAltImageFile(null);
    setAltImagePreview("");
    setAltImageBase64("");
    setAltImageMimeType("");
  };

  const handleAltText = async () => {
    const hasImageInput = altMode === "image" && (altImageBase64 || altImageDescription.trim());
    const hasVideoInput = altMode === "video" && altYoutubeUrl.trim();
    if (!hasImageInput && !hasVideoInput) return;
    setLoading(true); setError(null); setResult(null);

    const styleInfo = ALT_TEXT_STYLES.find(s => s.value === altStyle) || ALT_TEXT_STYLES[0];
    const styleInstruction = buildStyleInstruction(styleInfo);

    try {
      let parsed, sourceMode;

      if (altMode === "image") {
        sourceMode = altImageBase64 ? "upload" : "description";
        const schema = `{"alt_text":"the alt text, following the style instruction above","long_description":"a fuller description for complex images — empty string if alt_text alone covers it, or if the style is Concise","notes":"any accessibility considerations, e.g. text baked into the image that should also appear as real text nearby",${SEO_BENEFITS_SCHEMA}}`;

        if (altImageBase64) {
          const prompt = `Write accessibility alt text for this image.${altContext.trim() ? ` Keywords / page context: ${altContext.trim()}` : ""}
${styleInstruction}
${PRECISION_INSTRUCTION}
${SEO_BENEFITS_INSTRUCTION}
Return ONLY valid JSON, no markdown, no preamble:
${schema}
${JSON_VALIDITY_INSTRUCTION}`;
          const res = await fetch("/api/analyze-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "image", prompt, imageBase64: altImageBase64, imageMimeType: altImageMimeType, maxTokens: 2000 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Request failed.");
          parsed = parseModelJson(data.text);
        } else {
          const sys = `You are an accessibility specialist writing image alt text from a text description (the actual image is confidential and can't be uploaded). ${SENTENCE_CASE_RULE} Return ONLY valid JSON. No markdown, no preamble.`;
          const usr = `Write accessibility alt text for an image described as: "${altImageDescription.trim()}"${altContext.trim() ? `\nKeywords / page context: ${altContext.trim()}` : ""}
${styleInstruction}
${PRECISION_INSTRUCTION}
${SEO_BENEFITS_INSTRUCTION}
Return:
${schema}
${JSON_VALIDITY_INSTRUCTION}`;
          parsed = await callClaude(sys, usr, 2000);
        }
      } else {
        const prompt = `Watch this video and provide accessibility information about it.${altContext.trim() ? ` Keywords / page context: ${altContext.trim()}` : ""}
${styleInstruction}
${PRECISION_INSTRUCTION}
${SEO_BENEFITS_INSTRUCTION}
Return ONLY valid JSON, no markdown, no preamble:
{"video_alt_text":"the video alt text, following the style instruction above","appears_captioned":true or false — true only if you can actually SEE burned-in/open captions in the video frames themselves; if you can't tell from the visuals, use false,"transcript_captions":"a full transcript of the spoken audio, formatted as readable caption text with natural line breaks — this is a draft caption track to use IF the video turns out to lack real closed captions on YouTube","notes":"1-2 sentences of any other accessibility notes, e.g. important on-screen text or visuals not covered by the audio",${SEO_BENEFITS_SCHEMA}}
${JSON_VALIDITY_INSTRUCTION}`;
        const res = await fetch("/api/analyze-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "video", prompt, videoUrl: altYoutubeUrl.trim(), maxTokens: 5000 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Request failed.");
        parsed = parseModelJson(data.text);
      }

      // Use whichever keyword the model surfaced with the highest estimated
      // volume to pull related Google Trends data.
      const volumeRank = { High: 3, Medium: 2, Low: 1 };
      const topKeyword = [...(parsed.seo_keywords || [])].sort((a, b) => (volumeRank[b.search_volume] || 0) - (volumeRank[a.search_volume] || 0))[0]?.keyword;
      const trendsKeyword = topKeyword || altContext.trim();
      const trends = await fetchTrendingKeywords(trendsKeyword);

      if (altMode === "image") {
        setResult({ type: "alttext-image", ...parsed, sourceMode, style: styleInfo.label, trendsKeyword, trendsData: trends });
      } else {
        setResult({ type: "alttext-video", ...parsed, style: styleInfo.label, trendsKeyword, trendsData: trends });
      }
    } catch (e) {
      setError(describeError(e));
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .cl-mode:hover { background: #EDEBE5 !important; }
        .cl-mode.on { background: #1C1915 !important; color: #F5F2EC !important; }
        .cl-btn:hover:not(:disabled) { background: #A83412 !important; }
        .cl-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .cl-input:focus { border-color: #C8401A !important; }
        .cl-copy:hover { background: #EDEBE5 !important; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #CEC9C0; border-radius: 2px; }
        @keyframes pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
        .cl-fade { animation: pop 0.3s ease; }
        .cl-dot { animation: blink 1.2s ease-in-out infinite; }
        .cl-shell * { text-align: left; }
        @media (max-width: 600px) {
          .cl-shell { padding-left: 16px !important; padding-right: 16px !important; }
          .cl-field { flex-direction: column !important; gap: 6px !important; }
          .cl-field-hint { padding-top: 0 !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F2EFE9", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <header style={{ padding: "16px 28px 14px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1.5px solid #DDD9D0", background: "#F2EFE9", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#1C1915", letterSpacing: "-0.5px" }}>
            Generate Alt Text with AI
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8401A", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: "1px solid #C8401A30", borderRadius: 3, background: "#FFF0EC", marginLeft: 8 }}>beta</span>
          </span>
          <span style={{ fontSize: 13, color: "#8A8580", lineHeight: 1.5 }}>Upload an image and let AI generate SEO-optimized, accessible alt text in seconds.</span>
        </header>

        {/* Two-column body: form left, results right */}
        <div className="cl-shell" style={{ display: "flex", flexDirection: "column", maxWidth: 760, margin: 0, padding: "28px 28px 60px" }}>

          <div className="cl-form-col" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 26 }}>

            <Field label="Media Type:" hint="Image alt text, or a video description + caption check via a public YouTube link.">
              <div style={{ display: "flex", background: "#E8E4DC", borderRadius: 7, padding: 3, gap: 2 }}>
                {["image", "video"].map(m => (
                  <button key={m} className={`cl-mode ${altMode === m ? "on" : ""}`}
                    onClick={() => { setAltMode(m); setResult(null); setError(null); }}
                    style={{ flex: 1, padding: "9px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", color: "#7A7570", transition: "all 0.15s" }}>
                    {m === "image" ? "Image" : "Video (YouTube)"}
                  </button>
                ))}
              </div>
            </Field>

            <StepBlock number={1} title={altMode === "image" ? "Upload an Image" : "Provide a Video URL"}>
              {altMode === "image" ? (
                <>
                  {altImagePreview ? (
                    <div style={{ position: "relative", display: "inline-block" }}>
                      <img src={altImagePreview} alt="Upload preview" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, border: "1.5px solid #E0DBD2", display: "block" }} />
                      <button onClick={clearAltImage} type="button"
                        style={{ position: "absolute", top: 8, right: 8, padding: "5px 10px", background: "#1C1915", color: "#FFF", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10 }}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <input type="file" accept="image/*" onChange={e => handleAltImageFile(e.target.files?.[0])}
                      style={{ ...inputBase, padding: "11px 14px", cursor: "pointer" }} />
                  )}
                  {altImageFile && (
                    <p style={{ fontSize: 12, color: "#9A9590", marginTop: 6 }}>File: {altImageFile.name} ({Math.round(altImageFile.size / 1024 * 10) / 10} KB)</p>
                  )}

                  <div style={{ marginTop: 14 }}>
                    <Field label="Or Describe the Image:" hint="Use this instead if the image is confidential/restricted and can't be uploaded — describe it in enough detail to write from.">
                      <textarea className="cl-input" value={altImageDescription} onChange={e => setAltImageDescription(e.target.value)} rows={3}
                        disabled={!!altImagePreview}
                        placeholder="e.g. Product shot of a phone on a marble surface, screen showing the home grid, soft studio lighting from the left."
                        style={{ ...inputBase, resize: "none", opacity: altImagePreview ? 0.5 : 1 }} />
                    </Field>
                  </div>
                </>
              ) : (
                <input className="cl-input" value={altYoutubeUrl} onChange={e => setAltYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={inputBase} />
              )}
            </StepBlock>

            <StepBlock number={2} title="Provide Context (Optional)">
              <label style={{ ...labelStyle, marginBottom: 6 }}>Keywords / Page Context</label>
              <input className="cl-input" value={altContext} onChange={e => setAltContext(e.target.value)}
                placeholder="e.g. hero image on Galaxy S26 product page"
                style={inputBase} />
              <p style={{ fontSize: 12, color: "#9A9590", lineHeight: 1.55, marginTop: 6 }}>Help AI understand the context where this image will be used.</p>
            </StepBlock>

            <StepBlock number={3} title="Choose Alt Text Style">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ALT_TEXT_STYLES.map(s => (
                  <StyleCard key={s.value} style={s} active={altStyle === s.value} onClick={() => setAltStyle(s.value)} />
                ))}
              </div>
            </StepBlock>

            <div>
              <button className="cl-btn" onClick={handleAltText}
                disabled={loading || (altMode === "image" ? (!altImageBase64 && !altImageDescription.trim()) : !altYoutubeUrl.trim())}
                style={{ width: "100%", padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Analyzing…" : "Generate Alt Text with AI →"}
              </button>
              <div style={{ marginTop: 12, padding: "12px 14px", background: "#FFF8F0", border: "1px solid #C0782025", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#7A4E10", lineHeight: 1.55, margin: 0 }}>
                  <strong>⚠️ AI-Generated Alt Text — Please Review for Accuracy.</strong> While our AI is highly accurate, always review generated alt text to ensure it correctly describes your image and matches your intended use.
                </p>
              </div>
            </div>

          </div>

          <div className="cl-results-col" style={{ width: "100%", marginTop: 8 }}>

            {/* ── LOADING ── */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="cl-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8401A", animationDelay: `${i * 0.18}s` }} />
                  ))}
                </div>
                <p style={{ color: "#A0998F", fontSize: 13 }}>
                  {altMode === "video" ? "Watching the video…" : "Looking at the image…"}
                </p>
              </div>
            )}

            {/* ── ERROR ── */}
            {!loading && error && (
              <div style={{ marginTop: 20, padding: "14px 16px", background: "#FFF0EC", border: "1.5px solid #C8401A30", borderRadius: 8, color: "#A63315", fontSize: 13, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {!loading && result?.type === "alttext-image" && (() => {
              const kw = (result.seo_keywords || []).map(k => k.keyword);
              const bf = result.benefits_highlighted || [];
              const volumeRank = { High: 3, Medium: 2, Low: 1 };
              const rankedKeywords = [...(result.seo_keywords || [])].sort((a, b) => (volumeRank[b.search_volume] || 0) - (volumeRank[a.search_volume] || 0));
              return (
              <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                {altImagePreview && result.sourceMode === "upload" && (
                  <img src={altImagePreview} alt="Analyzed" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, border: "1.5px solid #E0DBD2" }} />
                )}

                {result.style && (
                  <div style={{ alignSelf: "flex-start", padding: "5px 12px", background: "#FFF3EE", border: "1px solid #C8401A25", borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: "#A63315", fontFamily: "'DM Sans', sans-serif" }}>{result.style}</div>
                )}

                <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px", position: "relative" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Alt Text</p>
                  <p style={{ fontSize: 15, color: "#1C1915", lineHeight: 1.55, fontWeight: 600, paddingRight: 52 }}>{highlightText(result.alt_text, kw, bf)}</p>
                  <p style={{ fontSize: 11, color: "#B0ABA4", fontFamily: "'DM Mono', monospace", marginTop: 8 }}>{(result.alt_text || "").length} characters</p>
                  <button className="cl-copy" onClick={() => handleCopy(result.alt_text, "alt-main")}
                    style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "alt-main" ? "#1E7A48" : "#9A9590" }}>
                    {copied === "alt-main" ? "✓" : "Copy"}
                  </button>
                </div>

                {result.long_description && (
                  <div style={{ background: "#F7F5F0", border: "1px solid #DDD9D0", borderRadius: 8, padding: "14px 16px", position: "relative" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Long Description</p>
                    <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6, paddingRight: 52 }}>{highlightText(result.long_description, kw, bf)}</p>
                    <button className="cl-copy" onClick={() => handleCopy(result.long_description, "alt-long")}
                      style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "alt-long" ? "#1E7A48" : "#9A9590" }}>
                      {copied === "alt-long" ? "✓" : "Copy"}
                    </button>
                  </div>
                )}

                {result.notes && (
                  <Pill type="fix">{result.notes}</Pill>
                )}

                {(kw.length > 0 || bf.length > 0) && (
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9A9590" }}>
                    {kw.length > 0 && <span><mark style={{ background: "#DFF5E8", color: "#1A5C38", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Keyword</span>}
                    {bf.length > 0 && <span><mark style={{ background: "#E4EBFF", color: "#2A3D80", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Benefit</span>}
                  </div>
                )}

                {rankedKeywords.length > 0 && (
                  <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 4 }}>Suggested SEO Keywords</p>
                    {rankedKeywords.map((k, i) => <VolumeRow key={i} keyword={k.keyword} volume={k.search_volume} note={k.note} />)}
                  </div>
                )}

                {bf.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Benefits Highlighted</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {bf.map((f, i) => (
                        <span key={i} style={{ padding: "5px 11px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 20, fontSize: 12, color: "#2A3D80", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <TrendingKeywordsPanel keyword={result.trendsKeyword} data={result.trendsData} />
              </div>
              );
            })()}

            {!loading && result?.type === "alttext-video" && (() => {
              const kw = (result.seo_keywords || []).map(k => k.keyword);
              const bf = result.benefits_highlighted || [];
              const volumeRank = { High: 3, Medium: 2, Low: 1 };
              const rankedKeywords = [...(result.seo_keywords || [])].sort((a, b) => (volumeRank[b.search_volume] || 0) - (volumeRank[a.search_volume] || 0));
              return (
              <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                {result.style && (
                  <div style={{ alignSelf: "flex-start", padding: "5px 12px", background: "#FFF3EE", border: "1px solid #C8401A25", borderRadius: 20, fontSize: 11.5, fontWeight: 600, color: "#A63315", fontFamily: "'DM Sans', sans-serif" }}>{result.style}</div>
                )}

                <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px", position: "relative" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Video Alt Text</p>
                  <p style={{ fontSize: 15, color: "#1C1915", lineHeight: 1.55, fontWeight: 600, paddingRight: 52 }}>{highlightText(result.video_alt_text, kw, bf)}</p>
                  <p style={{ fontSize: 11, color: "#B0ABA4", fontFamily: "'DM Mono', monospace", marginTop: 8 }}>{(result.video_alt_text || "").length} characters</p>
                  <button className="cl-copy" onClick={() => handleCopy(result.video_alt_text, "vid-alt")}
                    style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "vid-alt" ? "#1E7A48" : "#9A9590" }}>
                    {copied === "vid-alt" ? "✓" : "Copy"}
                  </button>
                </div>

                <div style={{ padding: "12px 14px", background: result.appears_captioned ? "#F0FBF5" : "#FFF8F0", border: `1px solid ${result.appears_captioned ? "#1E7A4830" : "#C0782030"}`, borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: result.appears_captioned ? "#1A5C38" : "#7A4E10", lineHeight: 1.55, margin: 0 }}>
                    {result.appears_captioned
                      ? "Burned-in captions appear to be visible in the video frames."
                      : "No burned-in captions were visible in the video frames — this doesn't confirm whether a separate YouTube caption track exists, only that none are visibly on-screen. Check YouTube's CC settings to be sure, or use the transcript below as a caption draft either way."}
                  </p>
                </div>

                {result.transcript_captions && (
                  <div style={{ background: "#F7F5F0", border: "1px solid #DDD9D0", borderRadius: 8, padding: "14px 16px", position: "relative" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Draft Transcript / Captions</p>
                    <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.7, whiteSpace: "pre-wrap", paddingRight: 52 }}>{highlightText(result.transcript_captions, kw, bf)}</p>
                    <button className="cl-copy" onClick={() => handleCopy(result.transcript_captions, "vid-transcript")}
                      style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "vid-transcript" ? "#1E7A48" : "#9A9590" }}>
                      {copied === "vid-transcript" ? "✓" : "Copy"}
                    </button>
                  </div>
                )}

                {result.notes && (
                  <Pill type="fix">{result.notes}</Pill>
                )}

                {(kw.length > 0 || bf.length > 0) && (
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9A9590" }}>
                    {kw.length > 0 && <span><mark style={{ background: "#DFF5E8", color: "#1A5C38", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Keyword</span>}
                    {bf.length > 0 && <span><mark style={{ background: "#E4EBFF", color: "#2A3D80", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Benefit</span>}
                  </div>
                )}

                {rankedKeywords.length > 0 && (
                  <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 4 }}>Suggested SEO Keywords</p>
                    {rankedKeywords.map((k, i) => <VolumeRow key={i} keyword={k.keyword} volume={k.search_volume} note={k.note} />)}
                  </div>
                )}

                {bf.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Benefits Highlighted</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {bf.map((f, i) => (
                        <span key={i} style={{ padding: "5px 11px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 20, fontSize: 12, color: "#2A3D80", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                <TrendingKeywordsPanel keyword={result.trendsKeyword} data={result.trendsData} />
              </div>
              );
            })()}

            {!loading && !error && !result && (
              <div style={{ padding: "48px 32px", textAlign: "left", background: "#FBFAF7", border: "1.5px dashed #DDD9D0", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                  <rect x="3" y="4" width="18" height="14" rx="2" stroke="#B0ABA4" strokeWidth="1.5" />
                  <path d="M7 9h10M7 12.5h7M7 16h4" stroke="#B0ABA4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#1C1915", margin: 0 }}>Your results will show up here</p>
                <p style={{ fontSize: 13, color: "#9A9590", lineHeight: 1.6, margin: 0 }}>Complete the 3 steps above, then generate — this space fills in with your alt text, suggested SEO keywords, and highlighted benefits.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </>
  );
}
