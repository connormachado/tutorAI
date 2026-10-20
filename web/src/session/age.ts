// The 13+ age check (R-36). The screen asks for a birth month and year; this decides. Only the
// yes/no survives, never the month or year entered (P-15).

export interface YearMonth {
  year: number;
  /** 1 to 12. */
  month: number;
}

/**
 * True only once the student has certainly turned 13. Without a day, a birthday this month might
 * not have happened yet, so that month counts as not yet.
 */
export function isThirteenOrOlder(born: YearMonth, today: YearMonth): boolean {
  const months = (today.year - born.year) * 12 + (today.month - born.month);
  return months > 13 * 12;
}
