// REAL sample, trimmed: this repository's thorough-mode suite AFTER the 2026-10-01 change (the
// tips were removed, so the four intent phrases now assert NO output — the opposite of before).
// The check() lines are verbatim; the setup they use was cut.
// Kept as data for test-integrity-check-heads.test.js; never run.
const outSteward = runHook('@prompt wrap it up', stewardProj);
check('steward project gets steward variant', outSteward.includes('[prompt-mode/steward]'));
check('steward variant renders from model', outSteward.includes('RENDER'));

const bareProj = fs.mkdtempSync(path.join(os.tmpdir(), 'tm-bare-'));
const outBare = runHook('@prompt wrap it up', bareProj);
check('non-steward project gets classic protocol', outBare.includes('DRAFT') && !outBare.includes('[prompt-mode/steward]'));

// --- @fc: fires on the keyword; its intent typed WITHOUT the keyword injects nothing ---
// Expectation changed 2026-10-01 (tips removed; tests/no-tips.test.js holds the evidence): these four
// phrases asserted a "[hint] Tip: add `@fc`" line until then; they now assert no output at all.
const FC_INTENTS_WITHOUT_KEYWORD = ['stop telling me to run things', "don't point me to the file", 'least clicks please', 'do it yourself'];
for (const text of FC_INTENTS_WITHOUT_KEYWORD) {
  check(`@fc intent without the keyword injects nothing: "${text}"`, runHook(text, neutralProj) === '');
}
// Expectation changed 2026-10-01 (review finding): this check asserted only "no [hint] line", which
// every input meets once the tips are gone. It now asserts what the prompt does produce.
const fcWithIntent = runHook('@fc stop telling me to run things', neutralProj);
check('@fc with its intent phrase injects only [fewer-clicks]',
  fcWithIntent.startsWith('[fewer-clicks]') && (fcWithIntent.match(/^\[[a-z/-]+\]/gm) || []).length === 1);
check('@fc injection keeps the confirm-anyway rule',
  runHook('@fc do it').includes('STILL CONFIRM'));
check('@fc injection names the in-environment delivery rule',
  runHook('@fc do it').includes('DELIVER IN-ENVIRONMENT'));
