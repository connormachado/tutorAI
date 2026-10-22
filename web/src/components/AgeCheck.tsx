import { useState } from "react";
import { isThirteenOrOlder } from "../session/age";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Props {
  /** Only the answer leaves this screen; the month and year entered stay in it (P-15). */
  onAnswer: (thirteenOrOlder: boolean) => void;
}

// Asked before anything else (R-36), in a neutral way: nothing on the screen says where the
// cutoff is, neither list starts on an answer, and the years run a full century back.
export function AgeCheck({ onAnswer }: Props) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - i);

  return (
    <form
      className="age"
      onSubmit={(e) => {
        e.preventDefault();
        // Today as of the tap, not as of the render: the page may have sat open past a month's end.
        const now = new Date();
        onAnswer(
          isThirteenOrOlder({ year: Number(year), month: Number(month) }, { year: now.getFullYear(), month: now.getMonth() + 1 }),
        );
      }}
    >
      <div className="age__fields">
        <label className="age__field">
          Month
          <select value={month} onChange={(e) => setMonth(e.target.value)} autoFocus>
            <option value="" disabled>
              Pick one
            </option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="age__field">
          Year
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="" disabled>
              Pick one
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="btn btn--primary btn--big" disabled={!month || !year}>
        Continue
      </button>
    </form>
  );
}
