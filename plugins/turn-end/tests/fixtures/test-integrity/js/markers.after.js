// REAL sample, trimmed: this repository's kb-pull suite AFTER the 2026-10-01 change (the canonical
// machine-text list grew from six to nine). The check() lines are verbatim; the setup was cut.
// Kept as data for test-integrity-check-heads.test.js; never run.
check('plain text not machine', !hook.isMachineText('why did we reject the porter caste'));
check('system-reminder prompts are machine text (audit 2: this copy lacked the marker)',
  hook.isMachineText('<system-reminder>\nStop hook additional context: …'));
// 2026-10-01: the canonical list grew from six to nine — the helper hand-back as hooks receive it
// ('<agent-message'), a peer session's message ('<cross-session-message'), and the saved form
// ('Another Claude session sent a message'). Exact list + order: tests/kb-pull-origin.test.js.
check('the canonical nine markers are all present',
  ['[SYSTEM NOTIFICATION', '<task-notification>', 'Stop hook feedback:', '<local-command', '<command-name>', '<system-reminder>',
    '<agent-message', '<cross-session-message', 'Another Claude session sent a message']
    .every((m) => hook.MACHINE_TEXT_MARKERS.includes(m)) && hook.MACHINE_TEXT_MARKERS.length === 9);
check('a child session (turn-end judge) is detected from the env', hook.isChildSession({ MK_TURN_END_DEPTH: '1' }) && !hook.isChildSession({}));
