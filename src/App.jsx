import { useState } from "react";

const SENTENCE_CASE_RULE = "Grammar rule: use sentence case for all copy — capitalize only the first word and proper nouns, never Title Case.";

const API_URL = "/api/generate";
const TRENDS_API_URL = "/api/trends";

// Definition for labelStyle added to prevent reference errors
const labelStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#1C1915",
  fontFamily: "'DM Sans', sans-serif",
  display: "block",
  marginBottom: "6px"
};

// Updated to match official WCAG 2.2 standards
const WCAG_INFO = {
  image_alt: {
    criterion: "WCAG 2.2 — SC 1.1.1 Non-text Content (Level A)",
    note: "Non-text content is given a text alternative that serves the equivalent purpose.",
  },
  video_captions: {
    criterion: "WCAG 2.2 — SC 1.2.2 Captions (Prerecorded) (Level A)",
    note: "Captions are provided for all prerecorded audio content in synchronized media.",
  },
  video_alt: {
    criterion: "WCAG 2.2 — SC 1.2.5 Audio Description (Prerecorded) (Level AA)",
    note: "An alternative/description conveys the video's visual information for users who can't see it.",
  },
};

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

function parseModelJson(rawText) {
  const clean = (rawText || "").replace(/```json\n?|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("PARSE_ERROR: the AI's response wasn't valid JSON. This usually means the description ran long and a quote or line break inside it broke the format. Try again, or shorten the Context field if it keeps happening.");
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

function WcagBadge({ info }) {
  if (!info) return null;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", background: "#F5F8FF", border: "1px solid #3A5FC825", borderRadius: 8 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, color: "#2A3D80", background: "#E4EBFF", border: "1px solid #3A5FC830", borderRadius: 4, padding: "3px 7px", letterSpacing: "0.03em", flexShrink: 0, marginTop: 1 }}>WCAG</span>
      <div>
        <p style={{ fontSize: 12.5, fontWeight: 700, color: "#2A3D80", marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{info.criterion}</p>
        <p style={{ fontSize: 12, color: "#4A5A9A", lineHeight: 1.5, margin: 0 }}>{info.note}</p>
      </div>
    </div>
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
      <div style={{ height: 4, background: "#E8E3DB", borderRadius: 2, marginBottom: note ? 5 : 0, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2 }} />
      </div>
      {note && <p style={{ fontSize: 12, color: "#8A8580", margin: 0, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }}>{note}</p>}
    </div>
  );
}

function TrendingKeywordsPanel({ keyword, data }) {
  if (!keyword?.trim()) return null;
  const trendsUrl = `https://google.com{encodeURIComponent(keyword.trim())}`;
  const rising = data?.rising || [];
  const top = data?.top || [];
  const list = rising.length ? rising : top;

  return (
    <div style={{ background: "#FFF", border: "1.5px solid #DDD9D0", borderRadius: 10, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "none", color: "#9A9590" }}>
          {rising.length ? "Trending now" : "Related searches"} <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(Google Trends, based on "{keyword}")</span>
        </p>
        <a href={trendsUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#C8401A", fontFamily: "'DM Mono', monospace", textDecoration: "none" }}>View on Trends ↗</a>
      </div>
      {list.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {list.map((item, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", background: "#F0FBF5", border: "1px solid #1E7A4820", borderRadius: 20, fontSize: 12, color: "#1A5C38" }}>
              {item.query}
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#1E7A48", opacity: 0.7 }}>{item.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
