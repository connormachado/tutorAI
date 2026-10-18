import katex from "katex";
import { Fragment, useMemo } from "react";

function render(latex: string, displayMode = false): string {
  // trust stays false (the default), so \href, \includegraphics and friends are refused.
  return katex.renderToString(latex, { throwOnError: false, displayMode, strict: "ignore" });
}

export function Tex({ latex, display = false, className }: { latex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => render(latex, display), [latex, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Tutor text with inline math between single dollar signs: "Subtract $5$ from both sides."
// An unclosed "$" (mid-stream) shows as plain text until it closes.
export function MathText({ text }: { text: string }) {
  const parts = useMemo(() => splitMath(text), [text]);
  return (
    <>
      {parts.map((part, i) =>
        part.math ? <Tex key={i} latex={part.value} /> : <Fragment key={i}>{part.value}</Fragment>,
      )}
    </>
  );
}

export function splitMath(text: string): { math: boolean; value: string }[] {
  const out: { math: boolean; value: string }[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ math: false, value: text.slice(last, m.index) });
    out.push({ math: true, value: m[1]! });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ math: false, value: text.slice(last) });
  return out;
}
