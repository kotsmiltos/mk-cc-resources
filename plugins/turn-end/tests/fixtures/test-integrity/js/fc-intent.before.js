// REAL sample, trimmed: this repository's thorough-mode suite BEFORE the 2026-10-01 change (the
// committed version). The check() lines are verbatim; the setup they use was cut. This repo's
// suites use a hand-rolled check(name, condition) — the condition IS the assertion.
// Kept as data for test-integrity-check-heads.test.js; never run.
const outSteward = runHook('@prompt wrap it up', stewardProj);
check('steward project gets steward variant', outSteward.includes('[prompt-mode/steward]'));
check('steward variant renders from model', outSteward.includes('RENDER'));

const bareProj = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-bare-'));
const outBare = runHook('@prompt wrap it up', bareProj);
check('non-steward project gets classic protocol', outBare.includes('DRAFT') && !outBare.includes('[prompt-mode/steward]'));

// --- @fc: fires, hints on intent without the keyword, suppresses once active ---
const FC_HINT_INTENTS = ['stop telling me to run things', "don't point me to the file", 'least clicks please', 'do it yourself'];
for (const text of FC_HINT_INTENTS) {
  check(`@fc hint fires on intent: "${text}"`, runHook(text).includes('`@fc`'));
}
check('@fc hint suppressed when @fc already active',
  !runHook('@fc stop telling me to run things').includes('[hint]'));
check('@fc injection keeps the confirm-anyway rule',
  runHook('@fc do it').includes('STILL CONFIRM'));
check('@fc injection names the in-environment delivery rule',
  runHook('@fc do it').includes('DELIVER IN-ENVIRONMENT'));
