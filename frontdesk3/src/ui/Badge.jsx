import React from "react";

export function Badge({ children, tone = "neutral", style }) {
  const tones = {
    neutral: { border: "1px solid var(--border)", background: "var(--card)", color: "var(--text)" },
    primary: { border: "1px solid rgba(4,120,87,.25)", background: "var(--primary-soft)", color: "var(--primary)" },
    secondary: { border: "1px solid rgba(37,99,235,.25)", background: "var(--secondary-soft)", color: "var(--secondary)" },
    warn: { border: "1px solid rgba(217,119,6,.25)", background: "var(--warn-soft)", color: "var(--warn)" },
    danger: { border: "1px solid rgba(185,28,28,.25)", background: "var(--danger-soft)", color: "var(--danger)" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        fontSize: 12,
        padding: "3px 9px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...t,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
