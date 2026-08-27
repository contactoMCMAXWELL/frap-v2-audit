import React from "react";

export function SectionHeader({ title, right, subtitle }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
      <div>
        <div style={{ fontWeight: 1000, fontSize: 15 }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>{subtitle}</div> : null}
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}
