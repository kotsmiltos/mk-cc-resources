// REAL sample, trimmed: this repository's kb-pull suite BEFORE the 2026-10-01 change (the
// committed version). The check() lines are verbatim; the setup they use was cut.
// Kept as data for test-integrity-check-heads.test.js; never run.
check('plain text not machine', !hook.isMachineText('why did we reject the porter caste'));
check('system-reminder prompts are machine text (audit 2: this copy lacked the marker)',
  hook.isMachineText('<system-reminder>\nStop hook additional context: …'));
check('the canonical six markers are all present',
  ['[SYSTEM NOTIFICATION', '<task-notification>', 'Stop hook feedback:', '<local-command', '<command-name>', '<system-reminder>']
    .every((m) => hook.MACHINE_TEXT_MARKERS.includes(m)) && hook.MACHINE_TEXT_MARKERS.length === 6);
check('a child session (turn-end judge) is detected from the env', hook.isChildSession({ MK_TURN_END_DEPTH: '1' }) && !hook.isChildSession({}));
