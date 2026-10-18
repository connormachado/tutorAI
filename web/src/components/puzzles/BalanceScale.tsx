import { type ReactNode, useState } from "react";
import { pansLatex } from "../../content/balance";
import type { BalanceMove, BalancePuzzle, Pan, PuzzleMove, Skin } from "../../content/types";
import { Tex } from "../../math/MathText";
import type { PuzzleState } from "../../session/state";

interface Props {
  state: PuzzleState & { puzzle: BalancePuzzle };
  onMove: (move: PuzzleMove, echo?: string) => void;
  actions: ReactNode;
}

// The equation as a level plank: x-containers and loose units on each side. Every move is
// done to both sides; the server says whether it works, and only then is it drawn.
export function BalanceScale({ state, onMove, actions }: Props) {
  const { puzzle, done, pending } = state;
  const pans = state.pans ?? puzzle.start;
  const { words } = puzzle.skin;
  const [take, setTake] = useState(1);
  const [groups, setGroups] = useState(2);
  // Held, not disabled, while a move is graded, so focus stays on the button just pressed.
  const busy = pending !== null;
  const hold = busy || undefined;
  const move = (m: BalanceMove) => !busy && onMove({ check: "move", move: m });

  return (
    <>
      <Plank left={pans.left} right={pans.right} skin={puzzle.skin} />
      <div className="balance__eq">
        <Tex latex={pansLatex(pans)} display />
      </div>
      {!done && (
        <div className="balance__moves">
          <div className="balance__move">
            <Stepper value={take} min={1} max={30} label={words.units} onChange={setTake} />
            <span className="balance__noun">{take === 1 ? words.unit : words.units}</span>
            <button type="button" className="btn btn--primary" aria-disabled={hold} onClick={() => move({ op: "remove_units", n: take })}>
              Take off both sides
            </button>
          </div>
          <div className="balance__move">
            <Stepper value={groups} min={2} max={9} label="groups" onChange={setGroups} />
            <span className="balance__noun">equal groups</span>
            <button type="button" className="btn btn--primary" aria-disabled={hold} onClick={() => move({ op: "split", groups })}>
              Split both sides
            </button>
          </div>
        </div>
      )}
      <div className="problem__actions">
        {!done && (
          <button type="button" className="btn btn--quiet" aria-disabled={hold} onClick={() => move({ op: "start_over" })}>
            Start over
          </button>
        )}
        {actions}
      </div>
    </>
  );
}

// At a limit the button is held rather than disabled, so pressing it to the end keeps focus.
function Stepper(props: { value: number; min: number; max: number; label: string; onChange: (n: number) => void }) {
  const { value, min, max, label, onChange } = props;
  return (
    <span className="stepper">
      <button
        type="button"
        aria-label={`Fewer ${label}`}
        aria-disabled={value <= min || undefined}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        aria-label={`More ${label}`}
        aria-disabled={value >= max || undefined}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </span>
  );
}

const PLANK_Y = 196;
const BOX = { w: 34, h: 40, pitch: 40, perRow: 4 };
const UNIT = { r: 9, pitch: 21, perRow: 8 };

/** The highest point anything on this side reaches, in viewBox units. */
function sideTop(pan: Pan): number {
  const boxRows = Math.ceil(pan.x / BOX.perRow);
  const unitRows = Math.ceil(pan.units / UNIT.perRow);
  return PLANK_Y - 2 - boxRows * (BOX.h + 4) - unitRows * UNIT.pitch;
}

function Plank({ left, right, skin }: { left: Pan; right: Pan; skin: Skin }) {
  const { container, containers, unit, units } = skin.words;
  const say = (p: Pan) =>
    [p.x && `${p.x} ${p.x === 1 ? container : containers}`, p.units && `${p.units} ${p.units === 1 ? unit : units}`]
      .filter(Boolean)
      .join(" and ") || "nothing";
  const top = Math.min(sideTop(left), sideTop(right)) - 8;
  return (
    <svg
      className="balance__plank"
      // Crop to the tallest stack, so the drawing doesn't shrink under empty sky.
      viewBox={`0 ${Math.min(top, 120)} 420 ${242 - Math.min(top, 120)}`}
      role="img"
      aria-label={`Left side: ${say(left)}. Right side: ${say(right)}. The plank is level.`}
    >
      <Side pan={left} cx={110} />
      <Side pan={right} cx={310} />
      <rect x="12" y={PLANK_Y} width="396" height="10" rx="5" fill="var(--ink)" />
      <polygon points={`210,${PLANK_Y + 10} 184,240 236,240`} fill="var(--ink-soft)" />
    </svg>
  );
}

function Side({ pan, cx }: { pan: Pan; cx: number }) {
  const boxRows = Math.ceil(pan.x / BOX.perRow);
  const unitBase = PLANK_Y - 2 - boxRows * (BOX.h + 4);
  const row = (i: number, perRow: number, total: number, pitch: number) => {
    const r = Math.floor(i / perRow);
    const inRow = Math.min(perRow, total - r * perRow);
    return { r, x: cx - ((inRow - 1) * pitch) / 2 + (i % perRow) * pitch };
  };
  return (
    <g>
      {Array.from({ length: pan.x }, (_, i) => {
        const { r, x } = row(i, BOX.perRow, pan.x, BOX.pitch);
        const y = PLANK_Y - 2 - (r + 1) * (BOX.h + 4) + 4;
        return (
          <g key={`x${i}`}>
            <rect x={x - BOX.w / 2} y={y} width={BOX.w} height={BOX.h} rx="7" fill="var(--team)" />
            <text x={x} y={y + BOX.h / 2 + 7} textAnchor="middle" className="balance__x">
              x
            </text>
          </g>
        );
      })}
      {Array.from({ length: pan.units }, (_, i) => {
        const { r, x } = row(i, UNIT.perRow, pan.units, UNIT.pitch);
        return <circle key={`u${i}`} cx={x} cy={unitBase - UNIT.r - 1 - r * UNIT.pitch} r={UNIT.r} fill="var(--team-2)" />;
      })}
    </g>
  );
}
