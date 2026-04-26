---
artifact: requirements
schema_version: 1
produced_by: /research
read_by: /architect
---

<!--
TEMPLATE CONTRACT — read this before producing output.

Required inputs (read-only): spec (.pipeline/elicitation/SPEC.md)
Must NOT contain: restatement of SPEC content; implementation pseudocode; specific library/framework choices (those are architect's call); unfounded claims (every claim needs a perspective source)

Operating contract: think → verify → surface.
Before handing off REQ.md, verify each section against PASS criteria below.
Every FR/NFR must be testable. Every risk must be specific. Disagreements between
perspectives are SURFACED here — they are not resolved (that's the architect's job).
-->

## 1. Project Intent

**Purpose:** one paragraph — the problem reframed for downstream consumers, derived from SPEC.md.

**PASS:** describes the problem in technical terms (what changes, why this is needed), without restating SPEC verbatim.
**FAIL:** copies SPEC content; uses marketing language; no link to spec goals.
**If stuck:** if spec is too vague to derive technical intent, surface that as an open question rather than guessing.

## 2. Functional Requirements (FR)

**Purpose:** observable, testable behaviors the implementation must provide.

Format:
- [ ] **FR-NNN** — single-sentence verifiable claim. Each MUST be:
  - Specific (one behavior per FR)
  - Verifiable (a test or inspection can prove it)
  - Tagged with `VERIFY` keyword to mark it for downstream verification

**PASS:** every FR is one verifiable behavior; no compound FRs ("X and Y"); no aspirational language ("should be fast"); FR-NNN numbering is contiguous.
**FAIL:** vague FRs ("good UX"); compound FRs hiding multiple behaviors; FRs that restate the spec without translation.
**If stuck:** if a requirement cannot be made verifiable, it is NOT a functional requirement — move it to risks or open questions.

## 3. Non-Functional Requirements (NFR)

**Purpose:** quality attributes — performance, security, maintainability, accessibility — with measurable thresholds.

Format:
- [ ] **NFR-NNN** — quality attribute + threshold. Examples: "p95 response time under 200ms"; "no critical security findings in dependency audit"; "test coverage above 80% on new code".

**PASS:** each NFR has a measurable threshold and a test approach; threshold values are sourced (from constraint, from analogous system, from research).
**FAIL:** "be performant"; "be secure"; thresholds picked from thin air without source.
**If stuck:** if no threshold can be derived, write the NFR as an open question for the architect to resolve.

## 4. Constraints

**Purpose:** non-negotiable limits found during research — cannot be relaxed by architecture.

**PASS:** each constraint names what it forbids and the source (regulatory, technical, business). No generic "follow conventions".
**FAIL:** vague constraints; constraints without source attribution.
**If stuck:** write `_none_` if no real constraints emerged.

## 5. Risks

**Purpose:** specific threats to success surfaced during research, with severity and mitigation.

| ID | Description | Severity | Mitigation |
|----|-------------|----------|------------|

**PASS:** each risk has: specific failure mode (not "things could go wrong"), severity (high/medium/low), at least one mitigation candidate or "needs investigation".
**FAIL:** generic risks ("project might be hard"); missing severity; mitigation field empty without "needs investigation" tag.
**If stuck:** write `_none_` only if research genuinely surfaced no risks.

## 6. Unresolved Disagreements

**Purpose:** where research perspectives genuinely disagree — surfaced for architect to resolve, NOT silently averaged.

**PASS:** each disagreement names the parties (which perspectives), what they disagree about, and what hinges on the resolution. Empty list is acceptable when perspectives converged.
**FAIL:** disagreements smoothed over; "consensus reached" when there wasn't one.
**If stuck:** if perspectives didn't surface disagreements, the research likely lacks adversarial diversity — note this in section 7.

## 7. Source Perspectives

**Purpose:** brief attribution — who contributed what, so architect knows whose lens to weigh.

Format:
- **{perspective name}**: one-sentence summary of what they contributed and what they did not see.

**PASS:** every perspective lists both contribution and gap; gaps are honest ("did not consider mobile context", not "covered everything").
**FAIL:** perspective list without gaps; identical-sounding contributions revealing no real diversity.
**If stuck:** if a perspective contributed nothing distinct, drop it from the list rather than padding.

---

**Size signal:** typically 2–4 pages. Longer suggests scope creep into architecture.
**Completion check:** before handing off, verify FR/NFR numbering is contiguous and every entry tagged `VERIFY`.
