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
const TONE_VOICE_INSTRUCTION = `Also assess "tone_voice_breakdown" across four industry-standard tone dimensions (Nielsen Norman Group's four dimensions of tone of voice). For each, give a "percent" (0-100) placing the copy on that scale, and a one-sentence "note" explaining why:
- formality: 0 = Formal, 100 = Casual
- humor: 0 = Serious, 100 = Funny
- respectfulness: 0 = Respectful, 100 = Irreverent
- enthusiasm: 0 = Matter-of-fact, 100 = Enthusiastic`;
const TONE_VOICE_SCHEMA = `"tone_voice_breakdown":{"formality":{"percent":0,"note":""},"humor":{"percent":0,"note":""},"respectfulness":{"percent":0,"note":""},"enthusiasm":{"percent":0,"note":""}}`;

const AEO_ANSWER_FORMAT_RULES = `Answer format rules — apply to every "answer" field:
- State facts directly. Make the product name or feature the subject; you need not address the reader as "you".
- Never make people the subject. Do not write what "users", "buyers", "customers", "reviewers", or "people" do, say, report, or experience — state the product fact itself. WRONG: "Buyers highlight the battery life." RIGHT: "The battery lasts more than a day."
- Never cite or reference data, reviews, sources, or URLs in the answer text.
- Open with one direct, declarative sentence stating the conclusion and echoing the question's core keyword.
- Resolve the question, then stop — complete but not padded. As a rough cap, about 5 sentences and 3 short paragraphs.
- Use paragraphs of 1-2 sentences with a blank line (\\n\\n) between them; never let a paragraph reach 3 sentences.
- Use bullets (lines starting with "- ", one item per line, joined with \\n) for any procedure (a sequence of steps or actions) or any list of 3+ items, reasons, conditions, or options. If you'd otherwise join 3+ things with commas or "and"/"or", make them bullets instead. The opening sentence always stays a plain sentence, never a bullet.
- Include specific values (numbers, dates, models) only when they're genuinely relevant to the question, not just because they're available.`;

const API_URL = "/api/generate";
const TRENDS_API_URL = "/api/trends";

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

function ToneVoicePanel({ data }) {
  if (!data) return null;
  const dims = [
    { key: "formality", left: "Formal", right: "Casual" },
    { key: "humor", left: "Serious", right: "Funny" },
    { key: "respectfulness", left: "Respectful", right: "Irreverent" },
    { key: "enthusiasm", left: "Matter-of-fact", right: "Enthusiastic" },
  ];
  const present = dims.filter(d => data[d.key]);
  if (!present.length) return null;
  return (
    <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
      <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 16 }}>Tone &amp; Voice</p>
      {present.map((d, idx) => {
        const pct = Math.max(0, Math.min(100, data[d.key].percent ?? 50));
        return (
          <div key={d.key} style={{ marginBottom: idx === present.length - 1 ? 0 : 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: pct < 50 ? "#1C1915" : "#B0ABA4", fontFamily: "'DM Sans', sans-serif" }}>{d.left}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#B0ABA4" }}>{pct}%</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 50 ? "#1C1915" : "#B0ABA4", fontFamily: "'DM Sans', sans-serif" }}>{d.right}</span>
            </div>
            <div style={{ position: "relative", height: 5, background: "#E8E3DB", borderRadius: 3 }}>
              <div style={{ position: "absolute", left: `${pct}%`, top: -3.5, width: 12, height: 12, borderRadius: "50%", background: "#C8401A", transform: "translateX(-50%)", border: "2px solid #FFF", boxShadow: "0 0 0 1px #DDD9D0" }} />
            </div>
            {data[d.key].note && <p style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.5, marginTop: 8 }}>{data[d.key].note}</p>}
          </div>
        );
      })}
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
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590" }}>
          {rising.length ? "Trending Now" : "Related Searches"} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Google Trends)</span>
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

function AeoAnswer({ text, keywords = [], features = [] }) {
  if (!text) return null;
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
        const isBulletBlock = lines.length > 0 && lines.every(l => l.startsWith("- "));
        if (isBulletBlock) {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              {lines.map((line, j) => (
                <li key={j} style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6 }}>
                  {highlightText(line.replace(/^- /, ""), keywords, features)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.6, margin: 0 }}>
            {highlightText(block, keywords, features)}
          </p>
        );
      })}
    </div>
  );
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
  const [aeoPageName, setAeoPageName] = useState("");
  const [aeoPageType, setAeoPageType] = useState("");
  const [aeoPagePurpose, setAeoPagePurpose] = useState("");
  const [aeoPageTemplate, setAeoPageTemplate] = useState("");
  const [aeoReferenceUrl, setAeoReferenceUrl] = useState("");
  const [aeoFaqDirection, setAeoFaqDirection] = useState("");

  const [benchBrief, setBenchBrief] = useState("");
  const [benchAudience, setBenchAudience] = useState("");

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
${TONE_VOICE_INSTRUCTION} (assess the overall set of variants together)
Return:
{"variants":[{"copy":"","angle":"2-3 word label","rationale":"1-2 sentences","strength":"1 sentence","watch_out":"1 honest limitation","tone_match":0${generateKeyword.trim() ? ',"keyword_use":0' : ""}${generateKeyword.trim() ? ',"keyword_fit":"1 sentence on whether/how the keyword was used, or why it was skipped"' : ""},"keywords_used":[],"features_used":[]}],"narrative":"",${TONE_VOICE_SCHEMA}}`;
      const [data, trends] = await Promise.all([
        callClaude(sys, usr, 3400),
        fetchTrendingKeywords(generateKeyword || brief.split(/\s+/).slice(0, 4).join(" ")),
      ]);
      setResult({ type: "generate", ...data, trendsKeyword: generateKeyword.trim() || brief.split(/\s+/).slice(0, 4).join(" "), trendsData: trends });
      setSelectedV(0);
    } catch (e) {
      setError(describeError(e));
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
${TONE_VOICE_INSTRUCTION}
Return:
{"verdict":"one sharp sentence","overall_score":78,"scores":{"clarity":{"score":80,"note":""},"tone_of_voice":{"score":75,"note":""},"audience_fit":{"score":82,"note":""},"accuracy":{"score":85,"note":""},"structure":{"score":70,"note":""}${targetKeyword.trim() ? ',"keyword_usage":{"score":0,"note":""},"length_fit":{"score":0,"note":""}' : ""}},"flags":["problem 1"],"improvements":["suggestion 1"],"rewrite":"sharper version or null",${TONE_VOICE_SCHEMA}}`;
      const [data, trends] = await Promise.all([
        callClaude(sys, usr, 2900),
        fetchTrendingKeywords(targetKeyword || inputCopy.split(/\s+/).slice(0, 4).join(" ")),
      ]);
      setResult({ type: "analyze", ...data, trendsKeyword: targetKeyword.trim() || inputCopy.split(/\s+/).slice(0, 4).join(" "), trendsData: trends });
    } catch (e) {
      setError(describeError(e));
    }
    setLoading(false);
  };

  const handleAeo = async () => {
    const sourceContent = aeoSource === "existing" ? aeoExistingFaqs : aeoBrief;
    if (!sourceContent.trim()) return;
    if (aeoSource === "brief" && !aeoPagePurpose.trim()) {
      setError("Add a Page Purpose before generating — the ranking and page-fit logic below depends on knowing what this specific page is for.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    try {
      const sys = `You are an AEO (Answer Engine Optimization) specialist and UX copywriter. You write FAQs designed to be pulled directly into AI-generated answers (ChatGPT, Google AI Overviews, Perplexity, voice assistants), meaning: each answer leads with the direct answer in the first sentence, uses natural question phrasing real people actually search/ask, stays concise and self-contained (no "as mentioned above"), and uses concrete specifics over vague marketing language. ${SENTENCE_CASE_RULE}

${AEO_ANSWER_FORMAT_RULES}

Return ONLY valid JSON. No markdown, no preamble.`;

      const task = aeoSource === "existing"
        ? `Revise the following FAQs to be AEO-optimized. Keep the core information but rewrite for directness and answer-engine friendliness. Add or split questions if it improves answerability. Existing FAQs:\n"""\n${aeoExistingFaqs}\n"""`
        : `Generate at least 10 FAQs for this brief that resolve what real users actually worry about when considering this. Brief:
"""
${aeoBrief}
"""

Your job is judgment, not coverage:
- Draw on realistic patterns of what shoppers actually search, ask, and worry about in this category, informed by your general knowledge of consumer behavior, reviews, and forum/support questions in this space. This is reasoning from training knowledge, not live retrieval — don't claim or imply you looked anything up. Ground each question in a real, recognizable shopper concern rather than inventing a plausible-sounding one from imagination.
- Derive questions from real concern clusters — don't invent a question first and then rationalize why someone might ask it.
- Rank by how much each matters to real users, highest first.
- Write only questions you're genuinely confident real shoppers would ask. One distinct topic per item, never repeated.
- Each Q&A must be self-contained — no cross-references to other FAQs on this page.
- Page fit comes before general relevance. A question must serve THIS page's Purpose and FAQ Direction (given below) — not just be a commonly-asked question in the category. A question that's common in general but belongs to a different type of page (e.g. a detailed product-spec question on a promotional/campaign page) does NOT qualify here, however common it is elsewhere. Before including an item, ask: would a visitor to THIS specific page actually ask this here? If it fits a different page better, drop it.
- The FAQ Direction below is a relevance filter, not a checklist to follow item-by-item: cover a more pressing on-topic concern first if it's clearly more important, and skip common topics that don't fit this specific page.`;

      const keywordBlock = aeoKeywords.trim()
        ? `\nTarget keywords to work in naturally where relevant: ${aeoKeywords.trim()}`
        : "";
      const featuresBlock = aeoFeatures.trim()
        ? `\nFeatures/details to highlight where relevant: ${aeoFeatures.trim()}`
        : "";
      const audienceBlock = aeoAudience.trim()
        ? `\nTarget audience: ${aeoAudience.trim()} — phrase questions the way this audience would actually ask them.`
        : "";

      const pageFields = [
        aeoPageName.trim() && `Page/Promotion Name: ${aeoPageName.trim()}`,
        aeoPageType.trim() && `Page Type: ${aeoPageType.trim()}`,
        aeoPagePurpose.trim() && `Page Purpose: ${aeoPagePurpose.trim()}`,
        aeoPageTemplate.trim() && `Page Template: ${aeoPageTemplate.trim()}`,
        aeoReferenceUrl.trim() && `Reference URL: ${aeoReferenceUrl.trim()}`,
      ].filter(Boolean);
      const pageContextBlock = pageFields.length ? `\n\nPage context:\n${pageFields.join("\n")}` : "";
      const faqDirectionBlock = aeoFaqDirection.trim() ? `\n\nFAQ direction: ${aeoFaqDirection.trim()}` : "";

      const usr = `${task}${keywordBlock}${featuresBlock}${audienceBlock}${pageContextBlock}${faqDirectionBlock}
For each FAQ, score "directness" (0-100: does the first sentence of the answer fully resolve the question with no throat-clearing).
Also identify which of the target keywords (if any) were actually used across the FAQs, and which features/details were highlighted.
Return:
{"faqs":[{"question":"phrased as a real user would ask","answer":"formatted per the answer format rules above — use \\n\\n between paragraphs and \\n-separated \"- \" bullets where specified","directness":0}],"keywords_used":["keyword actually used"],"features_highlighted":["feature actually mentioned"],"aeo_notes":"1-2 sentences of overall guidance or gaps to address"}`;

      const aeoTrendsKeyword = aeoKeywords.trim().split(",")[0]?.trim() || sourceContent.split(/\s+/).slice(0, 4).join(" ");
      const [data, trends] = await Promise.all([
        callClaude(sys, usr, 3400),
        fetchTrendingKeywords(aeoTrendsKeyword),
      ]);
      setResult({ type: "aeo", ...data, trendsKeyword: aeoTrendsKeyword, trendsData: trends });
    } catch (e) {
      setError(describeError(e));
    }
    setLoading(false);
  };

  const handleBenchmark = async () => {
    if (!benchBrief.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const sys = `You are a senior brand and copy strategist who specializes in competitive positioning. Be precise, direct, and honest — don't hedge or inflate anything to be diplomatic. Ground trend claims in what you actually know about the category; if you're inferring rather than certain, say so briefly. ${SENTENCE_CASE_RULE} Return ONLY valid JSON. No markdown, no preamble.`;

      const usr = `Build a competitive positioning report for this brief: "${benchBrief}"
${benchAudience.trim() ? `Target audience: ${benchAudience.trim()}` : ""}

Infer the product category, likely copy format, and 2 plausible representative competitors in this space from the brief itself — label them clearly as inferred.

Produce:
1. "trends": 3-5 current trends relevant to this category/campaign right now, each with a short "note" on why it matters here.
2. "competitor_analysis": for each inferred competitor, a "name", "copy_style" (1-2 sentences on their tone/positioning), "features_emphasized" (array of what they lead with), "strengths" (1 sentence), "weaknesses" (1 sentence — a real gap or opportunity, not a diplomatic non-answer).
3. "positioning_recommendation": 2-3 sentences on how this brief should position itself differently from the competitors and trends above — the specific angle to take.
4. "archetype_suggestions": the top 2-3 best-fit brand archetypes from the standard 12 (Innocent, Everyman, Hero, Outlaw, Explorer, Creator, Ruler, Magician, Lover, Caregiver, Jester, Sage), each with a "fit_percent" (0-100) and a "why" (1-2 sentences on how this archetype should shape the copy's personality).
${TONE_VOICE_INSTRUCTION} (as a RECOMMENDATION for where this copy should sit to stand out and fit the positioning — not an analysis of existing copy)
5. "recommendations": 4-6 concrete, specific suggestions for how to write the actual copy to execute this positioning.

Return:
{"trends":[{"trend":"","note":""}],"competitor_analysis":[{"name":"","copy_style":"","features_emphasized":[],"strengths":"","weaknesses":""}],"positioning_recommendation":"","archetype_suggestions":[{"archetype":"","fit_percent":0,"why":""}],${TONE_VOICE_SCHEMA},"recommendations":[""]}`;

      const data = await callClaude(sys, usr, 3800);
      setResult({ type: "benchmark", ...data });
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
        <header style={{ padding: "16px 28px 14px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1.5px solid #DDD9D0", background: "#F2EFE9", position: "sticky", top: 0, zIndex: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#1C1915", letterSpacing: "-0.5px" }}>
            copy/lab
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#C8401A", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: "1px solid #C8401A30", borderRadius: 3, background: "#FFF0EC", marginLeft: 8 }}>beta</span>
          </span>

          <div style={{ display: "flex", background: "#E8E4DC", borderRadius: 7, padding: 3, gap: 2, width: "fit-content", maxWidth: "100%", flexWrap: "nowrap", overflowX: "auto" }}>
            {["generate", "analyze", "aeo", "benchmark"].map(m => (
              <button key={m} className={`cl-mode ${mode === m ? "on" : ""}`}
                onClick={() => { setMode(m); setResult(null); setError(null); }}
                style={{ padding: "7px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", background: "transparent", color: "#7A7570", transition: "all 0.15s", flexShrink: 0, whiteSpace: "nowrap" }}>
                {m === "generate" ? "Generate" : m === "analyze" ? "Analyze" : m === "aeo" ? "AEO" : "Benchmark"}
              </button>
            ))}
          </div>
        </header>

        {/* Two-column body: form left, results right */}
        <div className="cl-shell" style={{ display: "flex", alignItems: "flex-start", gap: 32, maxWidth: 1100, margin: 0, padding: "28px 28px 60px" }}>

          <div className="cl-form-col" style={{ width: 360, flexShrink: 0, position: "sticky", top: 108 }}>

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
                  placeholder="Describe what you're writing about — the product category, feature, campaign moment, and goal. Use a generic description rather than the exact brand/product name (exact names can trigger content filters and cause failed generations)."
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
                  placeholder="List audience segments separated by commas, e.g. first-time buyers, busy parents, Gen Z gamers"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Keyword <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, works it in naturally)</span></label>
                <input className="cl-input" value={generateKeyword} onChange={e => setGenerateKeyword(e.target.value)}
                  placeholder="The exact word or phrase to naturally work into the copy, e.g. wireless earbuds"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Features to Highlight <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={generateFeatures} onChange={e => setGenerateFeatures(e.target.value)}
                  placeholder="List specific features separated by commas, e.g. 30-hour battery, IPX7 rating, wireless charging"
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
                  placeholder="Paste the exact copy you want reviewed — headline, body, CTA, or whatever you're evaluating."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, sharpens audience fit scoring)</span></label>
                <input className="cl-input" value={analyzeAudience} onChange={e => setAnalyzeAudience(e.target.value)}
                  placeholder="List audience segments separated by commas, e.g. first-time buyers, busy parents, Gen Z gamers"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Keyword <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, adds SEO scoring)</span></label>
                <input className="cl-input" value={targetKeyword} onChange={e => setTargetKeyword(e.target.value)}
                  placeholder="The exact word or phrase to check for in this copy, e.g. wireless earbuds"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Context <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <textarea className="cl-input" value={context} onChange={e => setContext(e.target.value)} rows={3}
                  placeholder="Any background that changes how this should be judged — campaign goal, where it appears, constraints, feedback you've already gotten."
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
                    placeholder="Paste your current FAQ questions and answers exactly as they appear now."
                    style={{ ...inputBase, resize: "none" }} />
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Product / Topic Brief</label>
                  <textarea className="cl-input" value={aeoBrief} onChange={e => setAeoBrief(e.target.value)} rows={6}
                    placeholder="Describe the product or topic generically — feature set, common customer questions, what AI-generated answers should get right. Avoid the exact brand/product name where possible."
                    style={{ ...inputBase, resize: "none" }} />
                </div>
              )}

              <div style={{ borderTop: "1px solid #DDD9D0", paddingTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                <p style={{ ...labelStyle, marginBottom: -2 }}>Page Context {aeoSource === "brief" ? <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#C8401A" }}>(Purpose required to generate)</span> : <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span>}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input className="cl-input" value={aeoPageName} onChange={e => setAeoPageName(e.target.value)}
                    placeholder="Page/promotion name, e.g. Holiday"
                    style={inputBase} />
                  <input className="cl-input" value={aeoPageType} onChange={e => setAeoPageType(e.target.value)}
                    placeholder="Page type, e.g. Promotion"
                    style={inputBase} />
                </div>
                <input className="cl-input" value={aeoPagePurpose} onChange={e => setAeoPagePurpose(e.target.value)}
                  placeholder={aeoSource === "brief" ? "Page purpose (required) — what this page is for and what it's selling/introducing" : "Page purpose — what this page is for and what it's selling/introducing"}
                  style={{ ...inputBase, borderColor: aeoSource === "brief" && !aeoPagePurpose.trim() ? "#C8401A50" : "#E0DBD2" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input className="cl-input" value={aeoPageTemplate} onChange={e => setAeoPageTemplate(e.target.value)}
                    placeholder="Page template, e.g. AEM"
                    style={inputBase} />
                  <input className="cl-input" value={aeoReferenceUrl} onChange={e => setAeoReferenceUrl(e.target.value)}
                    placeholder="Reference URL (for context, not fetched live)"
                    style={inputBase} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>FAQ Direction <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional — custom instructions for how these FAQs should be written)</span></label>
                <textarea className="cl-input" value={aeoFaqDirection} onChange={e => setAeoFaqDirection(e.target.value)} rows={3}
                  placeholder="e.g. Base FAQs on what real shoppers actually ask when considering this — natural consumer language, verified in search or community posts, polished tone suitable for a brand FAQ page. Reference complementary products only when it addresses a confirmed shopper concern."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Target Keywords <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={aeoKeywords} onChange={e => setAeoKeywords(e.target.value)}
                  placeholder="List target keywords separated by commas, e.g. wireless earbuds battery life, water resistance rating"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Features to Highlight <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional, comma-separated)</span></label>
                <input className="cl-input" value={aeoFeatures} onChange={e => setAeoFeatures(e.target.value)}
                  placeholder="List specific features separated by commas, e.g. 30-hour battery, IPX7 rating, wireless charging"
                  style={inputBase} />
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <input className="cl-input" value={aeoAudience} onChange={e => setAeoAudience(e.target.value)}
                  placeholder="List audience segments separated by commas, e.g. first-time buyers, busy parents, Gen Z gamers"
                  style={inputBase} />
              </div>

              <button className="cl-btn" onClick={handleAeo} disabled={loading || !(aeoSource === "existing" ? aeoExistingFaqs : aeoBrief).trim() || (aeoSource === "brief" && !aeoPagePurpose.trim())}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Optimizing…" : "Optimize for AEO →"}
              </button>
            </div>
          )}

          {/* ── BENCHMARK FORM ── */}
          {mode === "benchmark" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Brief / Idea</label>
                <textarea className="cl-input" value={benchBrief} onChange={e => setBenchBrief(e.target.value)} rows={5}
                  placeholder="Describe the product, campaign, or feature generically — what it is, who it's for, and what makes it worth talking about. Avoid the exact brand/product name where possible (it can trigger content filters). We'll identify trends, competitors, and positioning for you."
                  style={{ ...inputBase, resize: "none" }} />
              </div>

              <div>
                <label style={labelStyle}>Target Audience <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: "none", color: "#B0ABA4" }}>(optional)</span></label>
                <input className="cl-input" value={benchAudience} onChange={e => setBenchAudience(e.target.value)}
                  placeholder="List audience segments separated by commas, e.g. first-time buyers, busy parents, Gen Z gamers"
                  style={inputBase} />
              </div>

              <button className="cl-btn" onClick={handleBenchmark} disabled={loading || !benchBrief.trim()}
                style={{ padding: "15px", background: "#C8401A", color: "#FFF", border: "none", borderRadius: 8, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: "pointer", transition: "background 0.15s" }}>
                {loading ? "Building report…" : "Build Positioning Report →"}
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
                {mode === "generate" ? "Crafting 3 strategic variants…" : mode === "analyze" ? "Running full copy audit…" : mode === "aeo" ? "Optimizing for answer engines…" : "Researching trends and competitors…"}
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

                <ToneVoicePanel data={result.tone_voice_breakdown} />
                <div style={{ marginTop: 16 }}>
                  <TrendingKeywordsPanel keyword={result.trendsKeyword} data={result.trendsData} />
                </div>
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

                    {v.keywords_used?.length > 0 && (
                      <div>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Keywords Used</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {v.keywords_used.map((k, i) => (
                            <span key={i} style={{ padding: "5px 11px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 20, fontSize: 12, color: "#1A5C38", fontFamily: "'DM Sans', sans-serif" }}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {v.features_used?.length > 0 && (
                      <div>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 8 }}>Features Highlighted</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {v.features_used.map((f, i) => (
                            <span key={i} style={{ padding: "5px 11px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 20, fontSize: 12, color: "#2A3D80", fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                          ))}
                        </div>
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

              <ToneVoicePanel data={result.tone_voice_breakdown} />

              <TrendingKeywordsPanel keyword={result.trendsKeyword} data={result.trendsData} />

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
                      <div style={{ marginBottom: 10 }}>
                        <AeoAnswer text={f.answer} keywords={aeoKeywords.split(",")} features={aeoFeatures.split(",")} />
                      </div>
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

              <TrendingKeywordsPanel keyword={result.trendsKeyword} data={result.trendsData} />

            </div>
          )}

          {/* ── BENCHMARK RESULTS ── */}
          {!loading && result?.type === "benchmark" && (
            <div className="cl-fade" style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 20 }}>

              {result.positioning_recommendation && (
                <div style={{ padding: "18px 16px", background: "#1C1915", borderRadius: 10 }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#C8401A", marginBottom: 10 }}>Positioning Recommendation</p>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: "#F5F2EC", lineHeight: 1.5 }}>{result.positioning_recommendation}</p>
                </div>
              )}

              {result.trends?.length > 0 && (
                <div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: "#1C1915", marginBottom: 12 }}>Current Trends</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.trends.map((t, i) => (
                      <div key={i} style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 8, padding: "12px 14px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1C1915", marginBottom: 4 }}>{t.trend}</p>
                        <p style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.5 }}>{t.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.competitor_analysis?.length > 0 && (
                <div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: "#1C1915", marginBottom: 12 }}>Competitor Analysis</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {result.competitor_analysis.map((c, i) => (
                      <div key={i} style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14, color: "#1C1915", marginBottom: 8 }}>{c.name}</p>
                        {c.copy_style && <p style={{ fontSize: 13, color: "#3A3730", lineHeight: 1.55, marginBottom: 10 }}>{c.copy_style}</p>}
                        {c.features_emphasized?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                            {c.features_emphasized.map((f, j) => (
                              <span key={j} style={{ padding: "4px 10px", background: "#F5F8FF", border: "1px solid #3A5FC820", borderRadius: 20, fontSize: 11, color: "#2A3D80" }}>{f}</span>
                            ))}
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {c.strengths && (
                            <div style={{ padding: "10px 12px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 8 }}>
                              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#1E7A48", marginBottom: 4 }}>Strength</p>
                              <p style={{ fontSize: 12, color: "#1A5C38", lineHeight: 1.5 }}>{c.strengths}</p>
                            </div>
                          )}
                          {c.weaknesses && (
                            <div style={{ padding: "10px 12px", background: "#FFF8F0", border: "1px solid #C0782020", borderRadius: 8 }}>
                              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C07820", marginBottom: 4 }}>Gap</p>
                              <p style={{ fontSize: 12, color: "#7A4E10", lineHeight: 1.5 }}>{c.weaknesses}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.archetype_suggestions?.length > 0 && (
                <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9A9590", marginBottom: 14 }}>Brand Archetype Fit</p>
                  {result.archetype_suggestions.map((a, i) => (
                    <div key={i} style={{ marginBottom: i === result.archetype_suggestions.length - 1 ? 0 : 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1C1915" }}>{a.archetype}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 500, color: scoreColor(a.fit_percent), background: scoreColor(a.fit_percent) + "15", border: `1px solid ${scoreColor(a.fit_percent)}25`, borderRadius: 3, padding: "1px 7px" }}>{a.fit_percent}%</span>
                      </div>
                      <div style={{ height: 4, background: "#E8E3DB", borderRadius: 2, marginBottom: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${a.fit_percent}%`, background: scoreColor(a.fit_percent), borderRadius: 2 }} />
                      </div>
                      <p style={{ fontSize: 12, color: "#8A8580", lineHeight: 1.5 }}>{a.why}</p>
                    </div>
                  ))}
                </div>
              )}

              <ToneVoicePanel data={result.tone_voice_breakdown} />

              {result.recommendations?.length > 0 && (
                <div>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1E7A48", marginBottom: 8 }}>↑ Recommendations</p>
                  {result.recommendations.map((s, i) => <Pill key={i} type="fix">{s}</Pill>)}
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
