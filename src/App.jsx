import { useState } from "react";

const COPY_TYPES = [
  { value: "headline", label: "Headline" },
  { value: "tagline", label: "Tagline" },
  { value: "cta", label: "CTA" },
  { value: "social_caption", label: "Social Caption" },
  { value: "product_description", label: "Product Description" },
  { value: "onboarding_message", label: "Onboarding / Welcome" },
  { value: "push_notification", label: "Push Notification" },
  { value: "email_subject", label: "Email Subject Line" },
  { value: "tooltip", label: "Tooltip / Microcopy" },
  { value: "error_message", label: "Error Message" },
  { value: "empty_state", label: "Empty State" },
];

const TONE_TAGS = [
  "Confident", "Playful", "Direct", "Warm",
  "Premium", "Minimal", "Urgent", "Conversational",
  "Bold", "Empowering", "Witty", "Grounded",
];

const API_URL = "/api/generate";

async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Request failed.");
  }
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json\n?|```/g, "").trim();
  return JSON.parse(clean);
}

function Tag({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px", borderRadius: 20,
      border: `1.5px solid ${active ? "#C8401A" : "#DEDAD3"}`,
      background: active ? "#C8401A" : "transparent",
      color: active ? "#FFF" : "#7A7570",
      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
      fontSize: 13, fontWeight: 500, lineHeight: 1,
    }}>
      {label}
    </button>
  );
}

function ScoreBar({ label, score, note }) {
  const color = score >= 80 ? "#1E7A48" : score >= 60 ? "#C07820" : "#C0392B";
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1915", fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color, background: color + "15", border: `1px solid ${color}25`, borderRadius: 3, padding: "1px 7px" }}>{score}</span>
      </div>
      <div style={{ height: 4, background: "#E8E3DB", borderRadius: 2, marginBottom: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
      </div>
      <p style={{ fontSize: 12, color: "#8A8580", margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{note}</p>
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
  display: "block", fontFamily: "'Syne', sans-serif",
  fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "#9A9590", marginBottom: 8,
};

const scoreColor = s => s >= 80 ? "#1E7A48" : s >= 60 ? "#C07820" : "#C0392B";
const scoreLabel = s => s >= 80 ? "Strong" : s >= 65 ? "Needs work" : "Weak";

export default function CopyLab() {
  const [mode, setMode] = useState("generate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [selectedV, setSelectedV] = useState(0);
  const [copied, setCopied] = useState(null);

  const [brief, setBrief] = useState("");
  const [copyType, setCopyType] = useState("headline");
  const [tones, setTones] = useState([]);

  const [inputCopy, setInputCopy] = useState("");
  const [context, setContext] = useState("");
  const [analyzeFormat, setAnalyzeFormat] = useState("headline");

  const toggleTone = t => setTones(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    if (!brief.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const sys = `You are a senior UX copywriter and brand strategist. Return ONLY valid JSON. No markdown, no preamble.`;
      const usr = `Write 3 distinct variants of ${copyType.replace(/_/g, " ")} copy for: "${brief}"
Tone: ${tones.length ? tones.join(", ") : "balanced and on-brand"}
Return:
{"variants":[{"copy":"","angle":"2-3 word label","rationale":"1-2 sentences","strength":"1 sentence","watch_out":"1 honest limitation"}]}`;
      const data = await callClaude(sys, usr);
      setResult({ type: "generate", ...data });
      setSelectedV(0);
    } catch {
      setError("Generation failed. Check your brief and try again.");
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    if (!inputCopy.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const sys = `You are a senior UX copy strategist. Be precise and direct. Return ONLY valid JSON. No markdown, no preamble.`;
      const usr = `Review this ${analyzeFormat.replace(/_/g, " ")}: "${inputCopy}"
${context ? `Context: ${context}` : ""}
Return:
{"verdict":"one sharp sentence","overall_score":78,"scores":{"clarity":{"score":80,"note":""},"brand_voice":{"score":75,"note":""},"audience_fit":{"score":82,"note":""},"accuracy":{"score":85,"note":""},"structure":{"score":70,"note":""}},"flags":["problem 1"],"improvements":["suggestion 1"],"rewrite":"sharper version or null"}`;
      const data = await callClaude(sys, usr);
      setResult({ type: "analyze", ...data });
    } catch {
      setError("Analysis failed. Try again.");
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
        .cl-vtab { transition: background 0.15s, color 0.15s; }
        .cl-vtab.sel { background: #1C1915 !important; color: #F5F2EC !important; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F2EFE9", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto" }}>

        {/* Header */}
        <header style={{ height: 56, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1.5px solid #DDD9D0", background: "#F2EFE9", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#1C1915", letterSpacing: "-0.5px" }}>
            copy/lab
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8401A", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: "1px solid #C8401A30", borderRadius: 3, background: "#FFF0EC", marginLeft: 8 }}>beta</span>
          </span>

          <div style={{ display: "flex", background: "#E8E4DC", borderRadius: 7, padding: 3, gap: 2 }}>
            {["generate", "analyze"].map(m => (
              <button key={m} className={`cl-mode ${mode === m ? "on" : ""}`}
                onClick={() => { setMode(m); setResult(null); setError(null); }}
                style={{ padding: "7px 16px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", color: "#7A7570", transition: "all 0.15s" }}>
                {m === "generate" ? "Generate" : "Analyze"}
              </button>
            ))}
          </div>
        </header>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 40px" }}>

          {/* ── GENERATE FORM ── */}
          {mode === "generate" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Copy Type</label>
                <select className="cl-input" value={copyType} onChange={e => setCopyType(e.target.value)}
                  style={{ ...inputBase, cursor: "pointer" }}>
                  {COPY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle} htmlFor="copy-details">Brief</label>
                <textarea className="cl-input" id="copy-details" name="copy-details" value={brief} onChange={e => setBrief(e.target.value)} rows={5}
                  placeholder="What are you writing? Product, feature, campaign moment, placement, goal — the more context, the better."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Tone <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(pick any)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TONE_TAGS.map(t => <Tag key={t} label={t} active={tones.includes(t)} onClick={() => toggleTone(t)} />)}
                </div>
              </div>

              <button className="cl-btn" onClick={handleGenerate} disabled={loading || !brief.trim()}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Generating…" : "Generate 3 variants →"}
              </button>
            </div>
          )}

          {/* ── ANALYZE FORM ── */}
          {mode === "analyze" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
            <label htmlFor="copy-type" style={labelStyle}>Format</label>

            <select 
        id="copy-type" 
        className="cl-input" 
        value={analyzeFormat} 
        onChange={e => setAnalyzeFormat(e.target.value)}
        style={{ ...inputBase, cursor: "pointer" }}
      >
        {COPY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </div>
  </div>
)}
  
              <div>
                <label style={labelStyle}>Copy to Analyze</label>
                <textarea className="cl-input" value={inputCopy} onChange={e => setInputCopy(e.target.value)} rows={4}
                  placeholder="Paste the copy here."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Context <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <textarea className="cl-input" value={context} onChange={e => setContext(e.target.value)} rows={3}
                  placeholder="Campaign goal, placement, constraints, feedback already received…"
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <button className="cl-btn" onClick={handleAnalyze} disabled={loading || !inputCopy.trim()}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Analyzing…" : "Run Analysis →"}
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} className="cl-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8401A", animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
              <p style={{ color: "#A0998F", fontSize: 13 }}>
                {mode === "generate" ? "Crafting 3 strategic variants…" : "Running full copy audit…"}
              </p>
            </div>
          )}

          {/* ── ERROR ── */}
          {!loading && error && (
            <div style={{ marginTop: 20, padding: "14px 16px", background: "#FFF0EC", border: "1.5px solid #C8401A30", borderRadius: 8, color: "#A63315", fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {/* ── GENERATE RESULTS ── */}
          {!loading && result?.type === "generate" && (
            <div className="cl-fade" style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#1C1915", letterSpacing: "-0.3px" }}>3 Variants</h2>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9A9590", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {COPY_TYPES.find(t => t.value === copyType)?.label}
                </span>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 5, marginBottom: 16 }}>
                {result.variants?.map((v, i) => (
                  <button key={i} className={`cl-vtab ${selectedV === i ? "sel" : ""}`} onClick={() => setSelectedV(i)}
                    style={{ flex: 1, padding: "9px 6px", background: "#E8E4DC", color: "#7A7570", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {v.angle || `V${i + 1}`}
                  </button>
                ))}
              </div>

              {/* Variant card */}
              {result.variants?.[selectedV] && (() => {
                const v = result.variants[selectedV];
                return (
                  <div key={selectedV} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "20px 16px 16px", position: "relative" }}>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 22, color: "#1C1915", lineHeight: 1.25, letterSpacing: "-0.4px", paddingRight: 52 }}>
                        "{v.copy}"
                      </p>
                      <button className="cl-copy" onClick={() => handleCopy(v.copy, "main")}
                        style={{ position: "absolute", top: 14, right: 12, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "main" ? "#1E7A48" : "#9A9590" }}>
                        {copied === "main" ? "✓" : "Copy"}
                      </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ padding: "12px 13px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1E7A48", marginBottom: 5 }}>What lands</p>
                        <p style={{ fontSize: 12, color: "#1A5C38", lineHeight: 1.55 }}>{v.strength}</p>
                      </div>
                      <div style={{ padding: "12px 13px", background: "#FFF8F0", border: "1px solid #C0782020", borderRadius: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C07820", marginBottom: 5 }}>Watch out</p>
                        <p style={{ fontSize: 12, color: "#7A4E10", lineHeight: 1.55 }}>{v.watch_out}</p>
                      </div>
                    </div>

                    <div style={{ padding: "13px 14px", background: "#F7F5F0", border: "1px solid #DDD9D0", borderRadius: 8 }}>
                      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 6 }}>Strategy</p>
                      <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6 }}>{v.rationale}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── ANALYZE RESULTS ── */}
          {!loading && result?.type === "analyze" && (
            <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "18px 16px", background: "#1C1915", borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C8401A" }}>Verdict</p>
                  <div style={{ flex: 1, height: 1, background: "#333" }} />
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: scoreColor(result.overall_score), background: scoreColor(result.overall_score) + "25", border: `1px solid ${scoreColor(result.overall_score)}30`, borderRadius: 4, padding: "2px 8px" }}>
                    {scoreLabel(result.overall_score)}
                  </span>
                </div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: "#F5F2EC", lineHeight: 1.4, marginBottom: 12 }}>{result.verdict}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, fontWeight: 500, color: scoreColor(result.overall_score) }}>{result.overall_score}</span>
                  <span style={{ fontSize: 12, color: "#5A5550" }}>/100</span>
                </div>
              </div>

              <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 14 }}>Scorecard</p>
                {result.scores && Object.entries(result.scores).map(([k, v]) => (
                  <ScoreBar key={k} label={k.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())} score={v.score} note={v.note} />
                ))}
              </div>

              {result.flags?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C8401A", marginBottom: 8 }}>⚑ Flags</p>
                  {result.flags.map((f, i) => <Pill key={i} type="flag">{f}</Pill>)}
                </div>
              )}

              {result.improvements?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1E7A48", marginBottom: 8 }}>↑ Improvements</p>
                  {result.improvements.map((imp, i) => <Pill key={i} type="fix">{imp}</Pill>)}
                </div>
              )}

              {result.rewrite && (
                <div style={{ padding: "16px", background: "#FFF", border: "1.5px solid #C8401A25", borderRadius: 8, position: "relative" }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 10 }}>✦ Suggested rewrite</p>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 20, color: "#1C1915", lineHeight: 1.25, letterSpacing: "-0.3px", paddingRight: 52 }}>
                    "{result.rewrite}"
                  </p>
                  <button className="cl-copy" onClick={() => handleCopy(result.rewrite, "rewrite")}
                    style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "rewrite" ? "#1E7A48" : "#9A9590" }}>
                    {copied === "rewrite" ? "✓" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
