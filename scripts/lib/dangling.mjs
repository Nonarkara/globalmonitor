/**
 * A separator may not dangle.
 *
 * The plate says things like "ADS-B · 58m old · global sample" and "ACLED
 * not connected · Mar 2026". The middot is there because those are separate
 * facts, not one hyphenated word. But a middot is also a GLYPH, and a glyph
 * at the end of a line is a bullet that lost its list:
 *
 *     global sample ·
 *     CC-BY 4.0
 *
 * The reader sees a mark with nothing after it. That is the same class of
 * defect as a reading cut through the middle of its own glyph: the box drew
 * something the reader cannot make sense of.
 *
 * The house law is already written down, in the plate's own comment: "The
 * middot is for a compound of attributes — 'ADS-B · 58m old · global sample'
 * — which is short and never breaks." It DID break, and it broke at the
 * middot, and nothing stopped it.
 *
 * A COMMA is a different animal, and the house says so: "A LIST OF NAMES
 * takes commas, not the middot... A comma breaks the way a list is supposed
 * to break." So a comma that ends a line is a list breaking after its comma,
 * which is correct English and correct here — it is not a problem. A comma
 * that STARTS a line is a problem: a list's comma never starts a line.
 *
 * So the rule is about GEOMETRY, not about source text:
 *
 *   - a separator at the START of a line is always a problem;
 *   - a MIDDOT at the END of a line is a problem;
 *   - a comma at the END of a line is a list breaking, and is fine.
 *
 * The browser measures the line boxes; this decides. They are separate so
 * that the decision can be tested against a subject that carries the defect:
 * if the rule goes blind, its own mutation test fails.
 */

/** The characters that separate one thing from the next in a reading. */
export const SEPARATORS = ['·', ','];

/** The separators that must never end a line — the compound ones. */
const COMPOUND = '·';

/**
 * @typedef {object} Separator
 * @property {string} ch          the separator itself
 * @property {string} text        the reading it sits in, for the message
 * @property {number} top         its line box, top
 * @property {number} bottom      its line box, bottom
 * @property {number|null} nextTop    the next VISIBLE character's line box
 * @property {number|null} nextBottom
 * @property {number|null} prevTop    the previous VISIBLE character's line box
 * @property {number|null} prevBottom
 */

/**
 * @param {Separator[]} separators measured in the rendered plate
 * @returns {string[]} the problems found
 */
export function danglingSeparatorProblems(separators) {
  const problems = [];
  for (const s of separators || []) {
    const label = String(s.text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    // The next visible character is on the NEXT line: this separator is the
    // last thing the reader sees on this one.
    if (s.nextTop != null && s.nextTop > s.bottom - 0.5) {
      if (s.ch === COMPOUND) {
        problems.push(`a "${s.ch}" ends a line in "${label}"`);
        continue;
      }
      // A comma ending a line is a list breaking after its comma. Fine.
    }
    // The previous visible character is on the PREVIOUS line: this separator
    // is the first thing the reader sees on this one, which reads as a
    // bullet — a list's comma never starts a line.
    if (s.prevBottom != null && s.prevBottom < s.top + 0.5) {
      problems.push(`a "${s.ch}" starts a line in "${label}"`);
    }
  }
  return problems;
}
