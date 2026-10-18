// Platy the platypus. Decorative, so hidden from screen readers.
export function Mascot({ size = 56, mood = "calm" }: { size?: number; mood?: "calm" | "happy" }) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" aria-hidden="true" className="mascot">
      <ellipse cx="18" cy="48" rx="16" ry="9" fill="var(--platy-tail)" />
      <ellipse cx="46" cy="42" rx="30" ry="22" fill="var(--platy-body)" />
      <ellipse cx="50" cy="50" rx="18" ry="10" fill="var(--platy-belly)" />
      <path d="M68 30 C 82 24, 98 28, 97 38 C 96 47, 80 47, 68 42 Z" fill="var(--platy-bill)" />
      <circle cx="62" cy="30" r="3.4" fill="var(--ink)" />
      <circle cx="63.2" cy="28.8" r="1.1" fill="#fff" />
      {mood === "happy" && <path d="M56 37 q 4 4 8 0" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round" />}
      <ellipse cx="36" cy="63" rx="7" ry="4" fill="var(--platy-tail)" />
      <ellipse cx="58" cy="63" rx="7" ry="4" fill="var(--platy-tail)" />
    </svg>
  );
}
