import { useRef } from "react";
import { kidMathToLatex } from "../math/latex";
import { Tex } from "../math/MathText";

// Each key inserts plain text the parser understands, so what the kid sees in the box
// stays editable and the preview below shows how Platy reads it.
const KEYS: { label: string; aria: string; insert: string; caret?: number }[] = [
  { label: "x²", aria: "squared", insert: "^2" },
  { label: "xⁿ", aria: "to the power of", insert: "^" },
  { label: "√", aria: "square root", insert: "sqrt()", caret: -1 },
  { label: "a⁄b", aria: "fraction", insert: "/" },
  { label: "( )", aria: "parentheses", insert: "()", caret: -1 },
  { label: "±", aria: "plus or minus", insert: "±" },
  { label: "≤", aria: "less than or equal to", insert: "≤" },
  { label: "≥", aria: "greater than or equal to", insert: "≥" },
];

interface Props {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function MathInput({ id, label, value, placeholder, onChange, onSubmit, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const latex = kidMathToLatex(value);

  const insert = (text: string, caret = 0) => {
    const el = input.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + text + value.slice(end));
    const at = start + text.length + caret;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(at, at);
    });
  };

  return (
    <div className="math-input">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        className="math-input__field"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <div className="math-keys" role="group" aria-label="Math symbols">
        {KEYS.map((k) => (
          <button
            key={k.label}
            type="button"
            className="math-key"
            aria-label={k.aria}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(k.insert, k.caret)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <p className="math-preview" aria-live="polite">
        {latex ? (
          <>
            <span className="math-preview__label">Platy reads:</span> <Tex latex={latex} />
          </>
        ) : (
          <span className="math-preview__label">Type x^2 for x², sqrt(9) for √9, 3/4 for a fraction.</span>
        )}
      </p>
    </div>
  );
}
