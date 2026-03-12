import React from "react";

function Svg({ children, size = 18, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const I = {
  Service: (p) => (
    <Svg {...p}>
      <path d="M9 2h6v4H9z" />
      <path d="M8 6h8" />
      <rect x="6" y="6" width="12" height="16" rx="2" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
    </Svg>
  ),
  Unit: (p) => (
    <Svg {...p}>
      <path d="M3 14v-3a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
      <path d="M5 14h14" />
      <path d="M7 14v4" />
      <path d="M17 14v4" />
      <path d="M7 18h10" />
      <path d="M10 10h4" />
      <path d="M12 8v4" />
    </Svg>
  ),
  Pill: (p) => (
    <Svg {...p}>
      <path d="M10 14l4-4" />
      <path d="M7.5 16.5a4 4 0 0 1 0-5.6l3.4-3.4a4 4 0 0 1 5.6 5.6l-3.4 3.4a4 4 0 0 1-5.6 0z" />
      <path d="M14 10l4 4" />
    </Svg>
  ),
  Procedure: (p) => (
    <Svg {...p}>
      <path d="M4 20l4-4" />
      <path d="M14 4l6 6" />
      <path d="M13 5l-9 9" />
      <path d="M9 14l2 2" />
    </Svg>
  ),
  Heart: (p) => (
    <Svg {...p}>
      <path d="M20.8 8.6a5.5 5.5 0 0 0-9.8-3.4A5.5 5.5 0 0 0 3.2 8.6c0 6.2 7.8 11 7.8 11s9.8-4.8 9.8-11z" />
      <path d="M7 12h3l2-3 2 6 2-3h3" />
    </Svg>
  ),
  Note: (p) => (
    <Svg {...p}>
      <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
      <path d="M16 4v4h4" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </Svg>
  ),
  Lock: (p) => (
    <Svg {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  ),
  File: (p) => (
    <Svg {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </Svg>
  ),
  Pen: (p) => (
    <Svg {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  ),
  ArrowLeft: (p) => (
    <Svg {...p}>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  ),
};
