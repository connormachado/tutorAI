import { type Colors, PALETTE, PALETTE_IDS } from "../../content/palette";
import type { PaletteId } from "../../content/types";

export const chip = (c: Colors) => ({
  background: `linear-gradient(135deg, ${c.primary} 0 50%, ${c.secondary} 50% 100%)`,
});

// The student's own pick for the colors slot (R-38), from a fixed list.
export function Swatches({ value, onPick }: { value: PaletteId; onPick: (id: PaletteId) => void }) {
  return (
    <fieldset className="swatches">
      <legend className="visually-hidden">Pick your team colors</legend>
      {PALETTE_IDS.map((id) => (
        <label key={id} className="swatch" title={PALETTE[id].label}>
          <input
            type="radio"
            name="team-colors"
            className="visually-hidden"
            checked={value === id}
            onChange={() => onPick(id)}
          />
          <span className="swatch__chip" style={chip(PALETTE[id])} aria-hidden="true" />
          <span className="visually-hidden">{PALETTE[id].label}</span>
        </label>
      ))}
    </fieldset>
  );
}
