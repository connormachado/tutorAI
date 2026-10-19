import type { EmblemId } from "../../content/types";

// Platy's own emblem shapes for a team badge. Never a real team's logo (R-38).
const PATHS: Record<EmblemId, string> = {
  star: "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z",
  bolt: "M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z",
  shield: "M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z",
  wave: "M2 10c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3v3.5c-2.5 0-2.5-3-5-3s-2.5 3-5 3-2.5-3-5-3-2.5 3-5 3zm0 6c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3v3.5c-2.5 0-2.5-3-5-3s-2.5 3-5 3-2.5-3-5-3-2.5 3-5 3z",
};

export function Emblem({ id }: { id: EmblemId }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d={PATHS[id]} fill="currentColor" />
    </svg>
  );
}
