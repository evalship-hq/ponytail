// AGENTS.md arm: the ruleset agents without skill support (Codex, Cursor and others) load, as the system prompt.
const fs = require('fs');
const path = require('path');
const system = fs.readFileSync(path.join(__dirname, '..', '..', 'AGENTS.md'), 'utf8');
module.exports = ({ vars }) => [
  { role: 'system', content: system },
  { role: 'user', content: vars.task },
];
