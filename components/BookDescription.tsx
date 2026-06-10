"use client";

import { useState } from "react";

const FONT = '"Helvetica Now Display","Helvetica Neue",Helvetica,Arial,sans-serif';
const THRESHOLD = 400;

export default function BookDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > THRESHOLD;
  const displayed =
    needsToggle && !expanded ? text.slice(0, THRESHOLD).trimEnd() + "…" : text;

  return (
    <>
      <p
        style={{
          margin: 0,
          maxWidth: 760,
          color: "#d1d5db",
          lineHeight: 1.8,
          fontSize: 17,
        }}
      >
        {displayed}
      </p>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          style={{
            display: "inline-block",
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            fontSize: 13,
            fontFamily: FONT,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
