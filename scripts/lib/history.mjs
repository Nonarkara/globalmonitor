/**
 * THE ROW MUST BE A FUNCTION OF THE WIDTH, NOT OF THE ROAD.
 *
 * The chrome row is fitted at run time, on every resize. What the row
 * shows at a width must depend on that width ALONE. If it depends on the
 * widths visited before it, then the same width shows two different rows
 * — and a reader who resizes gets a different instrument than a reader
 * who loads the page.
 *
 * This is the rule, as a function: it takes the row's state on each road
 * and returns the roads that disagree. It does not know how the states
 * were measured, and it cannot look at the browser — so it can be tested
 * against a subject that carries the defect, and a rule that goes blind
 * fails its own test.
 *
 * A road is a way of arriving at a width:
 *
 *   'up'    — resized upward, from narrower;
 *   'down'  — resized downward, from wider;
 *   'fresh' — loaded at that width with no resizing at all.
 *
 * The 'up' and 'down' roads must agree at every width, and the 'fresh'
 * road must agree with them. A width where they do not is a width where
 * the row lies to somebody.
 */

/**
 * @param {{ up?: Map<number,string>, down?: Map<number,string>, fresh?: Map<number,string> }} subject
 * @returns {string[]} the roads that disagree, one line each
 */
export function historyDifferences(subject = {}) {
  const up = subject.up instanceof Map ? subject.up : new Map();
  const down = subject.down instanceof Map ? subject.down : new Map();
  const fresh = subject.fresh instanceof Map ? subject.fresh : new Map();
  const problems = [];

  for (const [width, state] of up) {
    if (!down.has(width)) continue;
    const other = down.get(width);
    if (state !== other) {
      problems.push(`${width}px  the row depends on the road — going up it is [${state}] and coming down it is [${other}]`);
    }
  }

  for (const [width, state] of fresh) {
    if (!up.has(width)) continue;
    const other = up.get(width);
    if (state !== other) {
      problems.push(`${width}px  the row depends on the road — loaded fresh it is [${state}] and resized it is [${other}]`);
    }
  }

  return problems;
}
