import { useState } from "react";

const COPY_TYPES = [
  { value: "headline", label: "Headline" },
  { value: "sub_headline", label: "Sub Headline" },
  { value: "body", label: "Body" },
  { value: "cta", label: "CTA" },
  { value: "usp", label: "USP" },
  { value: "social_caption", label: "Social Caption" },
  { value: "error_message", label: "Error Message" },
  { value: "empty_state", label: "Empty State" },
  { value: "tooltip", label: "Tooltip" },
  { value: "microcopy", label: "Microcopy" },
];

const TONE_TAGS = [
  "Confident", "Playful", "Direct", "Warm",
  "Premium", "Minimal", "Urgent", "Conversational",
  "Bold", "Empowering", "Witty", "Grounded",
];

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

function highlightText(text, keywordTerms = [], featureTerms = []) {
  if (!text) return text;
  const terms = [
    ...keywordTerms.filter(Boolean).map(t => ({ term: t.trim(), type: "keyword" })),
    ...featureTerms.filter(Boolean).map(t => ({ term: t.trim(), type: "feature" })),
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
  const [generateKeyword, setGenerateKeyword] = useState("");
  const [generateAudience, setGenerateAudience] = useState("");
  const [generateFeatures, setGenerateFeatures] = useState("");

  const [inputCopy, setInputCopy] = useState("");
  const [context, setContext] = useState("");
  const [analyzeFormat, setAnalyzeFormat] = useState("headline");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [analyzeAudience, setAnalyzeAudience] = useState("");

  const [aeoSource, setAeoSource] = useState("existing"); // "existing" | "brief"
  const [aeoExistingFaqs, setAeoExistingFaqs] = useState("");
  const [aeoBrief, setAeoBrief] = useState("");
  const [aeoKeywords, setAeoKeywords] = useState("");
  const [aeoFeatures, setAeoFeatures] = useState("");
  const [aeoAudience, setAeoAudience] = useState("");

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
      const sys = `You are a senior UX copywriter and brand strategist with strong SEO instincts. ${SENTENCE_CASE_RULE} Return ONLY valid JSON. No markdown, no preamble.`;
      const keywordBlock = generateKeyword.trim()
        ? `\nTarget keyword: "${generateKeyword.trim()}" — work it in naturally in at least one variant where it fits the format and doesn't feel forced. Don't stuff it if it hurts readability.`
        : "";
      const featuresBlock = generateFeatures.trim()
        ? `\nFeatures/details to highlight where relevant: ${generateFeatures.trim()}`
        : "";
      const usr = `Write 3 distinct variants of ${copyType.replace(/_/g, " ")} copy for: "${brief}"
Tone: ${tones.length ? tones.join(", ") : "balanced and on-brand"}${generateAudience.trim() ? `\nTarget audience: ${generateAudience.trim()} — write with this audience's needs, vocabulary, and expectations in mind.` : ""}${keywordBlock}${featuresBlock}

As you write the 3 variants, naturally work in the target keyword and features where relevant, without hurting readability or feeling stuffed.
For each variant, also score (0-100): "tone_match" (how strongly the variant reflects the requested tone${tones.length ? ` — ${tones.join(", ")}` : ""})${generateKeyword.trim() ? ', "keyword_use" (how naturally and effectively the target keyword is used, 0 if not used at all)' : ""}, and report "keywords_used" (exact substrings from the target keyword that literally appear in this variant's copy — omit if not used) and "features_used" (exact substrings from the features list that literally appear in this variant's copy — omit any that don't).
Also write a "narrative": 2-3 sentences on the creative through-line connecting these three variants — what story or positioning idea ties them together.
Return:
{"variants":[{"copy":"","angle":"2-3 word label","rationale":"1-2 sentences","strength":"1 sentence","watch_out":"1 honest limitation","tone_match":0${generateKeyword.trim() ? ',"keyword_use":0' : ""}${generateKeyword.trim() ? ',"keyword_fit":"1 sentence on whether/how the keyword was used, or why it was skipped"' : ""},"keywords_used":[],"features_used":[]}],"narrative":""}`;
      const data = await callClaude(sys, usr, 3000);
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
      const sys = `You are a senior UX copy strategist${targetKeyword.trim() ? " and SEO copy specialist" : ""}. Be precise and direct. ${SENTENCE_CASE_RULE} (Apply this rule to any rewrite you suggest.) Return ONLY valid JSON. No markdown, no preamble.`;
      const seoBlock = targetKeyword.trim()
        ? `\nTarget keyword: "${targetKeyword.trim()}"\nAlso evaluate SEO and add these two entries inside "scores": "keyword_usage" (score + note on whether the keyword appears naturally, in a strong position, and isn't stuffed) and "length_fit" (score + note on whether the character count suits ${analyzeFormat.replace(/_/g, " ")} for search/display purposes, e.g. ~50-60 chars for a title, ~150-160 for a meta description, stating the actual character count in the note).`
        : "";
      const usr = `Review this ${analyzeFormat.replace(/_/g, " ")}: "${inputCopy}"
${context ? `Context: ${context}` : ""}${analyzeAudience.trim() ? `\nTarget audience: ${analyzeAudience.trim()} — score "audience_fit" specifically against how well this copy speaks to this audience (their needs, vocabulary, expectations), not a generic audience.` : ""}${seoBlock}
Return:
{"verdict":"one sharp sentence","overall_score":78,"scores":{"clarity":{"score":80,"note":""},"tone_of_voice":{"score":75,"note":""},"audience_fit":{"score":82,"note":""},"accuracy":{"score":85,"note":""},"structure":{"score":70,"note":""}${targetKeyword.trim() ? ',"keyword_usage":{"score":0,"note":""},"length_fit":{"score":0,"note":""}' : ""}},"flags":["problem 1"],"improvements":["suggestion 1"],"rewrite":"sharper version or null"}`;
      const data = await callClaude(sys, usr, 2500);
      setResult({ type: "analyze", ...data });
    } catch {
      setError("Analysis failed. Try again.");
    }
    setLoading(false);
  };

  const handleAeo = async () => {
    const sourceContent = aeoSource === "existing" ? aeoExistingFaqs : aeoBrief;
    if (!sourceContent.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const sys = `You are an AEO (Answer Engine Optimization) specialist and UX copywriter. You write FAQs designed to be pulled directly into AI-generated answers (ChatGPT, Google AI Overviews, Perplexity, voice assistants), meaning: each answer leads with the direct answer in the first sentence, uses natural question phrasing real people actually search/ask, stays concise and self-contained (no "as mentioned above"), and uses concrete specifics over vague marketing language. ${SENTENCE_CASE_RULE} Return ONLY valid JSON. No markdown, no preamble.`;

      const task = aeoSource === "existing"
        ? `Revise the following FAQs to be AEO-optimized. Keep the core information but rewrite for directness and answer-engine friendliness. Add or split questions if it improves answerability. Existing FAQs:\n"""\n${aeoExistingFaqs}\n"""`
        : `Write 5-8 AEO-optimized FAQs from this brief:\n"""\n${aeoBrief}\n"""`;

      const keywordBlock = aeoKeywords.trim()
        ? `\nTarget keywords to work in naturally where relevant: ${aeoKeywords.trim()}`
        : "";
      const featuresBlock = aeoFeatures.trim()
        ? `\nFeatures/details to highlight where relevant: ${aeoFeatures.trim()}`
        : "";
      const audienceBlock = aeoAudience.trim()
        ? `\nTarget audience: ${aeoAudience.trim()} — phrase questions the way this audience would actually ask them.`
        : "";

      const usr = `${task}${keywordBlock}${featuresBlock}${audienceBlock}
For each FAQ, score "directness" (0-100: does the first sentence of the answer fully resolve the question with no throat-clearing).
Also identify which of the target keywords (if any) were actually used across the FAQs, and which features/details were highlighted.
Return:
{"faqs":[{"question":"phrased as a real user would ask","answer":"leads with the direct answer, then supporting detail","directness":0}],"keywords_used":["keyword actually used"],"features_highlighted":["feature actually mentioned"],"aeo_notes":"1-2 sentences of overall guidance or gaps to address"}`;

      const data = await callClaude(sys, usr, 3400);
      setResult({ type: "aeo", ...data });
    } catch {
      setError("AEO revision failed. Try again.");
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
        .cl-shell * { text-align: left; }
        @media (max-width: 860px) {
          .cl-shell { flex-direction: column !important; }
          .cl-form-col { width: 100% !important; position: static !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F2EFE9", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Header */}
        <header style={{ height: 56, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 24, borderBottom: "1.5px solid #DDD9D0", background: "#F2EFE9", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#1C1915", letterSpacing: "-0.5px" }}>
            copy/lab
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8401A", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: "1px solid #C8401A30", borderRadius: 3, background: "#FFF0EC", marginLeft: 8 }}>beta</span>
          </span>

          <div style={{ display: "flex", background: "#E8E4DC", borderRadius: 7, padding: 3, gap: 2 }}>
            {["generate", "analyze", "aeo"].map(m => (
              <button key={m} className={`cl-mode ${mode === m ? "on" : ""}`}
                onClick={() => { setMode(m); setResult(null); setError(null); }}
                style={{ padding: "7px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", color: "#7A7570", transition: "all 0.15s" }}>
                {m === "generate" ? "Generate" : m === "analyze" ? "Analyze" : "AEO"}
              </button>
            ))}
          </div>
        </header>

        {/* Two-column body: form left, results right */}
        <div className="cl-shell" style={{ display: "flex", alignItems: "flex-start", gap: 32, maxWidth: 1100, margin: 0, padding: "28px 28px 60px" }}>

          <div className="cl-form-col" style={{ width: 360, flexShrink: 0, position: "sticky", top: 76 }}>

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
                <label style={labelStyle}>Brief</label>
                <textarea className="cl-input" value={brief} onChange={e => setBrief(e.target.value)} rows={5}
                  placeholder="What are you writing? Product, feature, campaign moment, placement, goal — the more context, the better."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Tone <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(pick any)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TONE_TAGS.map(t => <Tag key={t} label={t} active={tones.includes(t)} onClick={() => toggleTone(t)} />)}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <input className="cl-input" value={generateAudience} onChange={e => setGenerateAudience(e.target.value)}
                  placeholder="e.g. first-time buyers, busy parents, Gen Z gamers…"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Keyword <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, works it in naturally)</span></label>
                <input className="cl-input" value={generateKeyword} onChange={e => setGenerateKeyword(e.target.value)}
                  placeholder="e.g. wireless earbuds, home security camera…"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Features to Highlight <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={generateFeatures} onChange={e => setGenerateFeatures(e.target.value)}
                  placeholder="e.g. 30-hour battery, IPX7 rating, wireless charging"
                  style={inputBase} />
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
                <label style={labelStyle}>Format</label>
                <select className="cl-input" value={analyzeFormat} onChange={e => setAnalyzeFormat(e.target.value)}
                  style={{ ...inputBase, cursor: "pointer" }}>
                  {COPY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Copy to Analyze</label>
                <textarea className="cl-input" value={inputCopy} onChange={e => setInputCopy(e.target.value)} rows={4}
                  placeholder="Paste the copy here."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, sharpens audience fit scoring)</span></label>
                <input className="cl-input" value={analyzeAudience} onChange={e => setAnalyzeAudience(e.target.value)}
                  placeholder="e.g. first-time buyers, busy parents, Gen Z gamers…"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Keyword <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, adds SEO scoring)</span></label>
                <input className="cl-input" value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)}
                  placeholder="e.g. wireless earbuds, home security camera…"
                  style={inputBase} />
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

          {/* ── AEO FORM ── */}
          {mode === "aeo" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Source</label>
                <div style={{ display: "flex", background: "#E8E4DC", borderRadius: 7, padding: 3, gap: 2 }}>
                  {["existing", "brief"].map(s => (
                    <button key={s} className={`cl-mode ${aeoSource === s ? "on" : ""}`}
                      onClick={() => setAeoSource(s)}
                      style={{ flex: 1, padding: "9px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", color: "#7A7570", transition: "all 0.15s" }}>
                      {s === "existing" ? "Revise existing" : "Create new"}
                    </button>
                  ))}
                </div>
              </div>

              {aeoSource === "existing" ? (
                <div>
                  <label style={labelStyle}>Existing FAQs</label>
                  <textarea className="cl-input" value={aeoExistingFaqs} onChange={e => setAeoExistingFaqs(e.target.value)} rows={6}
                    placeholder="Paste your current FAQ questions and answers here."
                    style={{ ...inputBase, resize: "none" }} />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Product / Topic Brief</label>
                  <textarea className="cl-input" value={aeoBrief} onChange={e => setAeoBrief(e.target.value)} rows={6}
                    placeholder="What's this for? Product, feature set, common customer questions, anything AI-generated answers should get right."
                    style={{ ...inputBase, resize: "none" }} />
                </div>
              )}

              <div>
                <label style={labelStyle}>Target Keywords <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={aeoKeywords} onChange={e => setAeoKeywords(e.target.value)}
                  placeholder="e.g. wireless earbuds battery life, water resistance rating"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Features to Highlight <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={aeoFeatures} onChange={e => setAeoFeatures(e.target.value)}
                  placeholder="e.g. 30-hour battery, IPX7 rating, wireless charging"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <input className="cl-input" value={aeoAudience} onChange={e => setAeoAudience(e.target.value)}
                  placeholder="e.g. first-time buyers, busy parents, Gen Z gamers…"
                  style={inputBase} />
              </div>

              <button className="cl-btn" onClick={handleAeo} disabled={loading || !(aeoSource === "existing" ? aeoExistingFaqs : aeoBrief).trim()}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Optimizing…" : "Optimize for AEO →"}
              </button>
            </div>
          )}

          </div>

          <div className="cl-results-col" style={{ flex: 1, minWidth: 0 }}>

          {/* ── LOADING ── */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "40px 0" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[0,1,2].map(i => (
                  <div key={i} className="cl-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#C8401A", animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
              <p style={{ color: "#A0998F", fontSize: 13 }}>
                {mode === "generate" ? "Crafting 3 strategic variants…" : mode === "analyze" ? "Running full copy audit…" : "Optimizing for answer engines…"}
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
            <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#1C1915", letterSpacing: "-0.3px" }}>3 Variants</h2>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#9A9590", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {COPY_TYPES.find(t => t.value === copyType)?.label}
                  </span>
                </div>

                {result.narrative && (
                  <div style={{ padding: "14px 16px", background: "#FFF8F0", border: "1px solid #C0782020", borderRadius: 8, marginBottom: 16 }}>
                    <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#C07820", marginBottom: 6 }}>Narrative</p>
                    <p style={{ fontSize: 13, color: "#7A4E10", lineHeight: 1.6 }}>{result.narrative}</p>
                  </div>
                )}
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
                        "{highlightText(v.copy, v.keywords_used || [], v.features_used || [])}"
                      </p>
                      <button className="cl-copy" onClick={() => handleCopy(v.copy, "main")}
                        style={{ position: "absolute", top: 14, right: 12, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "main" ? "#1E7A48" : "#9A9590" }}>
                        {copied === "main" ? "✓" : "Copy"}
                      </button>
                    </div>

                    {(typeof v.tone_match === "number" || typeof v.keyword_use === "number") && (
                      <div style={{ display: "flex", gap: 8 }}>
                        {typeof v.tone_match === "number" && (
                          <div style={{ flex: 1, padding: "10px 12px", background: "#FFF", border: "1px solid #DDD9D0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9A9590" }}>Tone Match</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500, color: scoreColor(v.tone_match) }}>{v.tone_match}%</span>
                          </div>
                        )}
                        {typeof v.keyword_use === "number" && (
                          <div style={{ flex: 1, padding: "10px 12px", background: "#FFF", border: "1px solid #DDD9D0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#9A9590" }}>Keyword Use</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500, color: scoreColor(v.keyword_use) }}>{v.keyword_use}%</span>
                          </div>
                        )}
                      </div>
                    )}

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

                    {v.keyword_fit && (
                      <div style={{ padding: "12px 13px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#3A5FC8", marginBottom: 5 }}>🔑 Keyword fit</p>
                        <p style={{ fontSize: 12, color: "#2A3D80", lineHeight: 1.55 }}>{v.keyword_fit}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(result.variants?.some(v => v.keywords_used?.length) || result.variants?.some(v => v.features_used?.length)) && (
                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#9A9590" }}>
                  {result.variants?.some(v => v.keywords_used?.length) && <span><mark style={{ background: "#DFF5E8", color: "#1A5C38", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Keyword</span>}
                  {result.variants?.some(v => v.features_used?.length) && <span><mark style={{ background: "#E4EBFF", color: "#2A3D80", padding: "1px 5px", borderRadius: 3 }}>▉</mark> Feature</span>}
                </div>
              )}

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
                    "{highlightText(result.rewrite, targetKeyword.split(","), [])}"
                  </p>
                  <button className="cl-copy" onClick={() => handleCopy(result.rewrite, "rewrite")}
                    style={{ position: "absolute", top: 14, right: 14, padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === "rewrite" ? "#1E7A48" : "#9A9590" }}>
                    {copied === "rewrite" ? "✓" : "Copy"}
                  </button>
                </div>
              )}

            </div>
          )}

          {/* ── AEO RESULTS ── */}
          {!loading && result?.type === "aeo" && (
            <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>

              {result.aeo_notes && (
                <div style={{ padding: "16px", background: "#1C1915", borderRadius: 10 }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C8401A", marginBottom: 8 }}>AEO Notes</p>
                  <p style={{ fontSize: 13, color: "#E8E4DC", lineHeight: 1.6 }}>{result.aeo_notes}</p>
                </div>
              )}

              <div>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#1C1915", letterSpacing: "-0.3px", marginBottom: 14 }}>
                  {result.faqs?.length || 0} AEO-Optimized FAQ{result.faqs?.length === 1 ? "" : "s"}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.faqs?.map((f, i) => (
                    <div key={i} style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px", position: "relative" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: "#1C1915", lineHeight: 1.35 }}>{f.question}</p>
                        {typeof f.directness === "number" && (
                          <span style={{ flexShrink: 0, fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: scoreColor(f.directness), background: scoreColor(f.directness) + "15", border: `1px solid ${scoreColor(f.directness)}25`, borderRadius: 3, padding: "1px 7px" }}>
                            {f.directness}%
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6, marginBottom: 10 }}>{highlightText(f.answer, aeoKeywords.split(","), aeoFeatures.split(","))}</p>
                      <button className="cl-copy" onClick={() => handleCopy(`${f.question}\n${f.answer}`, `faq-${i}`)}
                        style={{ padding: "5px 10px", background: "#F2EFE9", border: "1px solid #DDD9D0", borderRadius: 4, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: copied === `faq-${i}` ? "#1E7A48" : "#9A9590" }}>
                        {copied === `faq-${i}` ? "✓ Copied" : "Copy Q&A"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {result.keywords_used?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Keywords Used</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.keywords_used.map((k, i) => (
                      <span key={i} style={{ padding: "5px 11px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 20, fontSize: 12, color: "#1A5C38", fontFamily: "'DM Sans', sans-serif" }}>{k}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.features_highlighted?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Features Highlighted</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.features_highlighted.map((f, i) => (
                      <span key={i} style={{ padding: "5px 11px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 20, fontSize: 12, color: "#2A3D80", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {!loading && !error && !result && (
            <div style={{ padding: "60px 20px", textAlign: "left", color: "#B0ABA4" }}>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>Fill in the form on the left and run it — results will show up here.</p>
            </div>
          )}

          </div>

        </div>
      </div>
    </>
  );
}
