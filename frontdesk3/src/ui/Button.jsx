import React from "react";

const variants = {
  primary: {
    border: "1px solid var(--primary)",
    background: "var(--primary)",
    color: "#fff",
  },
  secondary: {
    border: "1px solid var(--secondary)",
    background: "var(--secondary)",
    color: "#fff",
  },
  ghost: {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
  },
  danger: {
    border: "1px solid var(--danger)",
    background: "var(--danger)",
    color: "#fff",
  },
};

export function Button({ variant = "ghost", disabled, children, style, ...props }) {
  const v = variants[variant] || variants.ghost;
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...v,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
