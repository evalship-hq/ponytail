// Behavior gate: does the ponytail ruleset actually PRODUCE its refined
// behaviors, not just carry the text? One check per probe (vars.probe), each
// targeting a rule that a field review (rcstack, phases 0-8) showed mattered:
//   hardware     - "hardware is never the spec ideal, leave the calibration knob"
//   explanation  - "explanation the user explicitly asked for is not debt"
//   onecheck     - "lazy code without its check is unfinished"
//
// Heuristic graders, same spirit as loc.js / correctness.js. The graders
// themselves are proven by tests/behavior.test.js (RED/GREEN, no API key).
//
// Metric: `behavior` (1 = behavior present, 0 = absent).

function proseOf(text) {
  return String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
}

// Whether the reply says it without negating it: "No calibration knob needed" names a knob and leaves none.
const NEGATION = /\b(no|not|never|without|skip|don't|doesn't|isn't|aren't|won't|needn't)\b/i;
const DISMISSED = /\b(not|isn't|aren't|n't)\b.*\b(needed|necessary|required|a concern|an issue)\b|\bunnecessary\b/i;
function affirmed(text, re) {
  for (const m of text.matchAll(new RegExp(re.source, 'gi'))) {
    const before = text.slice(0, m.index).split(/[.!?;:\n]/).pop().split(/\s+/).filter(Boolean).slice(-3).join(' ');
    const after = text.slice(m.index + m[0].length).split(/[.!?;\n]/)[0];
    if (!NEGATION.test(before) && !DISMISSED.test(after)) return true;
  }
  return false;
}

const CHECKS = {
  // Treats the device as non-ideal: leaves a tunable knob or flags per-unit drift.
  // A passing mention of "calibration" is not enough; it must be actionable.
  hardware(output) {
    const t = String(output || '');
    const drift = affirmed(t, /\bdrift|per[- ]unit|per[- ]part|part[- ]to[- ]part|measure your own|\btare\b|\btrim\b|\bknob|\btuning\b|reads off|known (temp|reference|value)|reference (thermometer|sensor|temp)|calibration (offset|constant|param|knob)/);
    return drift
      ? { pass: true, reason: 'Leaves a calibration knob / flags per-unit drift.' }
      : { pass: false, reason: 'Treats the hardware as ideal; no calibration knob.' };
  },

  // Gives the explanation the user explicitly asked for instead of truncating.
  explanation(output) {
    const p = proseOf(output);
    const words = p ? p.split(' ').length : 0;
    const structured = /(\d+[.)]\s|[-*]\s)/.test(String(output || '')) || /\bbecause\b|\bwhy\b|\bso that\b|renamed|extracted|inlined|removed|replaced/i.test(p);
    return words >= 45 && structured
      ? { pass: true, reason: `Gave the requested write-up (${words} words of prose).` }
      : { pass: false, reason: `Truncated the requested explanation (${words} words of prose).` };
  },

  // Leaves ONE runnable check behind for non-trivial logic.
  onecheck(output) {
    // Only code counts: a test promised in prose or a comment ("Add pytest tests later") isn't one left behind.
    const t = (String(output || '').match(/```[\s\S]*?```/g) || []).join('\n').replace(/(^|\s)(#|\/\/).*$/gm, '$1');
    const hasCheck = /\bassert\b|def\s+test_|if\s+__name__|unittest|pytest|console\.assert|\bexpect\(|\bdescribe\(|\bit\(/.test(t);
    return hasCheck
      ? { pass: true, reason: 'Left a runnable check (assert/test/demo).' }
      : { pass: false, reason: 'No runnable check left behind.' };
  },
};

module.exports = (output, context) => {
  const probe = context && context.vars && context.vars.probe;
  const check = CHECKS[probe];
  if (!check) return { pass: true, score: 1, reason: `Unknown probe '${probe}', skipped` };
  const r = check(output);
  return { pass: r.pass, score: r.pass ? 1 : 0, reason: r.reason };
};
