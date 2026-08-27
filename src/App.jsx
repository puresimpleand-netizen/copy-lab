import { useState } from "react";

const SENTENCE_CASE_RULE = "Grammar rule: use sentence case for all copy — capitalize only the first word and proper nouns, never Title Case.";

const API_URL = "/api/generate";

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
    try {
      if (altMode === "image") {
        if (altImageBase64) {
          const prompt = `Write accessibility alt text for this image.${altContext.trim() ? ` Context: ${altContext.trim()}` : ""}
Return ONLY valid JSON, no markdown, no preamble:
{"alt_text":"concise WCAG-appropriate alt text, ideally under 125 characters, describing what's functionally important about the image","long_description":"a fuller description for complex images (charts, infographics, multi-element layouts) — empty string if the image is simple enough that alt_text alone covers it","notes":"any accessibility considerations, e.g. text baked into the image that should also appear as real text nearby"}`;
          const res = await fetch("/api/analyze-media", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "image", prompt, imageBase64: altImageBase64, imageMimeType: altImageMimeType, maxTokens: 1200 }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Request failed.");
          const clean = data.text.replace(/```json\n?|```/g, "").trim();
          const parsed = JSON.parse(clean);
          setResult({ type: "alttext-image", ...parsed, sourceMode: "upload" });
        } else {
          const sys = `You are an accessibility specialist writing image alt text from a text description (the actual image is confidential and can't be uploaded). ${SENTENCE_CASE_RULE} Return ONLY valid JSON. No markdown, no preamble.`;
          const usr = `Write accessibility alt text for an image described as: "${altImageDescription.trim()}"${altContext.trim() ? `\nContext: ${altContext.trim()}` : ""}
Return:
{"alt_text":"concise WCAG-appropriate alt text under 125 characters","long_description":"a fuller description if the image sounds complex — empty string otherwise","notes":"any accessibility considerations"}`;
          const data = await callClaude(sys, usr, 1000);
          setResult({ type: "alttext-image", ...data, sourceMode: "description" });
        }
      } else {
        const prompt = `Watch this video and provide accessibility information about it.${altContext.trim() ? ` Context: ${altContext.trim()}` : ""}
Return ONLY valid JSON, no markdown, no preamble:
{"video_alt_text":"a concise description of what this video shows/is about, for accessibility (like alt text, but for video)","appears_captioned":true or false — true only if you can actually SEE burned-in/open captions in the video frames themselves; if you can't tell from the visuals, use false,"transcript_captions":"a full transcript of the spoken audio, formatted as readable caption text with natural line breaks — this is a draft caption track to use IF the video turns out to lack real closed captions on YouTube","notes":"1-2 sentences of any other accessibility notes, e.g. important on-screen text or visuals not covered by the audio"}`;
        const res = await fetch("/api/analyze-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "video", prompt, videoUrl: altYoutubeUrl.trim(), maxTokens: 4000 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Request failed.");
        const clean = data.text.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setResult({ type: "alttext-video", ...parsed });
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
            CIG Copy AI
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8401A", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: "1px solid #C8401A30", borderRadius: 3, background: "#FFF0EC", marginLeft: 8 }}>beta</span>
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#9A9590", letterSpacing: "0.05em", textTransform: "uppercase" }}>Alt Text</span>
        </header>

        {/* Two-column body: form left, results right */}
        <div className="cl-shell" style={{ display: "flex", flexDirection: "column", maxWidth: 760, margin: 0, padding: "28px 28px 60px" }}>

          <div className="cl-form-col" style={{ width: "100%" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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

              {altMode === "image" ? (
                <>
                  <Field label="Upload Image:" hint="Preferred when possible — the model looks directly at the image to write accurate alt text.">
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
                  </Field>

                  <Field label="Or Describe the Image:" hint="Use this instead if the image is confidential/restricted and can't be uploaded — describe it in enough detail to write from.">
                    <textarea className="cl-input" value={altImageDescription} onChange={e => setAltImageDescription(e.target.value)} rows={3}
                      disabled={!!altImagePreview}
                      placeholder="e.g. Product shot of a phone on a marble surface, screen showing the home grid, soft studio lighting from the left."
                      style={{ ...inputBase, resize: "none", opacity: altImagePreview ? 0.5 : 1 }} />
                  </Field>
                </>
              ) : (
                <Field label="YouTube URL:" required hint="Must be a public video (not private/unlisted). Gemini watches it directly via this link — no download needed.">
                  <input className="cl-input" value={altYoutubeUrl} onChange={e => setAltYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    style={inputBase} />
                </Field>
              )}

              <Field label="Context:" hint="Optional — product, page, or purpose, so the description fits where it'll be used.">
                <input className="cl-input" value={altContext} onChange={e => setAltContext(e.target.value)}
                  placeholder="e.g. hero image on Galaxy S26 product page"
                  style={inputBase} />
              </Field>

              <button className="cl-btn" onClick={handleAltText}
                disabled={loading || (altMode === "image" ? (!altImageBase64 && !altImageDescription.trim()) : !altYoutubeUrl.trim())}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Analyzing…" : "Generate alt text →"}
              </button>
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

            {!loading && result?.type === "alttext-image" && (
              <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                {altImagePreview && result.sourceMode === "upload" && (
                  <img src={altImagePreview} alt="Analyzed" style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 10, border: "1.5px solid #E0DBD2" }} />
                )}

                <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px", position: "relative" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Alt Text</p>
                  <p style={{ fontSize: 15, color: "#1C1915", lineHeight: 1.55, fontWeight: 600, paddingRight: 52 }}>{result.alt_text}</p>
                  <button className="cl-copy" onClick={() => handleCopy(result.alt_text, "alt-main")}
                    style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "alt-main" ? "#1E7A48" : "#9A9590" }}>
                    {copied === "alt-main" ? "✓" : "Copy"}
                  </button>
                </div>

                {result.long_description && (
                  <div style={{ background: "#F7F5F0", border: "1px solid #DDD9D0", borderRadius: 8, padding: "14px 16px", position: "relative" }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Long Description</p>
                    <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6, paddingRight: 52 }}>{result.long_description}</p>
                    <button className="cl-copy" onClick={() => handleCopy(result.long_description, "alt-long")}
                      style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "alt-long" ? "#1E7A48" : "#9A9590" }}>
                      {copied === "alt-long" ? "✓" : "Copy"}
                    </button>
                  </div>
                )}

                {result.notes && (
                  <Pill type="fix">{result.notes}</Pill>
                )}
              </div>
            )}

            {!loading && result?.type === "alttext-video" && (
              <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px", position: "relative" }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Video Alt Text</p>
                  <p style={{ fontSize: 15, color: "#1C1915", lineHeight: 1.55, fontWeight: 600, paddingRight: 52 }}>{result.video_alt_text}</p>
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
                    <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.7, whiteSpace: "pre-wrap", paddingRight: 52 }}>{result.transcript_captions}</p>
                    <button className="cl-copy" onClick={() => handleCopy(result.transcript_captions, "vid-transcript")}
                      style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "vid-transcript" ? "#1E7A48" : "#9A9590" }}>
                      {copied === "vid-transcript" ? "✓" : "Copy"}
                    </button>
                  </div>
                )}

                {result.notes && (
                  <Pill type="fix">{result.notes}</Pill>
                )}
              </div>
            )}

            {!loading && !error && !result && (
              <div style={{ padding: "48px 32px", textAlign: "left", background: "#FBFAF7", border: "1.5px dashed #DDD9D0", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                  <rect x="3" y="4" width="18" height="14" rx="2" stroke="#B0ABA4" strokeWidth="1.5" />
                  <path d="M7 9h10M7 12.5h7M7 16h4" stroke="#B0ABA4" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#1C1915", margin: 0 }}>Your results will show up here</p>
                <p style={{ fontSize: 13, color: "#9A9590", lineHeight: 1.6, margin: 0 }}>Fill in the form above, then run it — this space fills in with your generated alt text.</p>
              </div>
            )}

          </div>

        </div>
      </div>
    </>
  );
}
