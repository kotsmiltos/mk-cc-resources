# Exploration: Plugin Update Workflow

> **TL;DR:** Claude Code already has a version-based plugin update system — but third-party marketplaces have auto-update **disabled by default**, so your users must run `claude plugin update` manually or enable it. The real gaps: most plugins are missing version fields, there's no changelog, and mk-flow's per-project context files don't sync when defaults evolve. The fix is three things: (1) add version to every plugin.json, (2) maintain a RELEASE-NOTES.md per plugin following the superpowers convention, (3) expand `/mk-flow-update-rules` into a unified `/mk-flow-update` that syncs all context files using a key-based merge with source tags. Optionally, add a stale-detection nudge in the mk-flow hook so projects know when they're behind.

---

### Key Terms
- **Marketplace repo:** A git clone of the plugin source that CC refreshes. Lives at `~/.claude/plugins/marketplaces/<name>/`.
- **Plugin cache:** A versioned snapshot of installed plugin files. Lives at `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- **installed_plugins.json:** CC's registry tracking each installed plugin's version, install path, and git commit SHA.
- **Per-project context:** Files created by `/mk-flow-init` in each project (`context/rules.yaml`, `.claude/mk-flow/intents.yaml`, etc.) that start from plugin defaults but diverge with project-specific customizations.
- **Key-based merge:** A merge strategy where entries are matched by their YAML key name. Plugin defaults update shared keys; project-only keys are preserved.

---

## Current State Audit: Infrastructure Exists, Authoring Gaps Don't

CC's plugin update mechanism, discovered by examining the local filesystem and confirmed by documentation:

**Marketplace refresh:**
- CC clones marketplace repos to `~/.claude/plugins/marketplaces/<name>/`
- `known_marketplaces.json` tracks `lastUpdated` — mk-cc-resources was refreshed 2026-03-19 12:20
- **Critical caveat:** Auto-update on session start is enabled by default **only for the official Anthropic marketplace** (`claude-plugins-official`). Third-party marketplaces (including yours) require users to either manually enable auto-update or run `claude plugin marketplace update mk-cc-resources` explicitly.
- Git reflog confirms: `claude-plugins-official` shows pulls on every session start, while `mk-cc-resources` shows gaps (Mar 15 → Mar 19)

**Version comparison:**
- CC reads the `version` field from each plugin's `.claude-plugin/plugin.json`
- **`plugin.json` version takes priority over `marketplace.json` version** — if both set it, plugin.json wins silently
- Installed versions are tracked in `~/.claude/plugins/installed_plugins.json` with: version, installPath, installedAt, lastUpdated, gitCommitSha
- When marketplace version > installed version, CC triggers an update
- New versions get their own cache directory (e.g., `mk-cc-all/1.12.0/`, `mk-cc-all/1.13.0/`)
- `claude plugin update <plugin>` command exists for manual updates

**What's broken:**

| Issue | Impact |
|-------|--------|
| 7 of 9 plugins have **no version field** in their plugin.json | CC can't detect updates for these plugins |
| marketplace.json versions **diverge** from plugin.json | mk-cc-all: marketplace says 1.12.0, plugin.json says 1.13.0. mk-flow: marketplace says 0.1.0, plugin.json says 0.4.0 |
| **No changelog** anywhere | Even when CC updates a plugin, users have no idea what changed |
| **No git tags** | Can't browse history by version; no `git diff mk-flow@0.3.0..mk-flow@0.4.0` possible |
| mk-flow-update-rules covers **only rules.yaml** | intents.yaml and cross-references.yaml have no update mechanism |
| Third-party **auto-update disabled by default** | Users won't get updates automatically unless they configure it |

**Bottom line:** CC's plugin system handles detection and caching. The problem is authoring-side: missing versions, missing changelogs, and incomplete per-project sync.

---

## Prior Art: How Other Ecosystems Handle Updates

### In the CC Ecosystem: Superpowers Plugin

The official CC plugin `superpowers` (by Jesse Vincent, v5.0.2) provides the proven CC convention:
- `plugin.json` with semver `version` field
- `RELEASE-NOTES.md` at plugin root — `## v5.0.2 (2026-03-11)` headers with categorized `###` subheadings
- Human-written, detailed, reader-friendly — not auto-generated commit dumps
- No external tooling — just a version field and a markdown file

### Outside CC: Five Ecosystem Patterns

| Ecosystem | Update Detection | Config Migration | User Customization Safety | UX |
|-----------|-----------------|------------------|--------------------------|-----|
| **VS Code** | Background auto-check, auto-install | None (extension DIY) | Layered settings — defaults < user < workspace; overrides always win | Seamless for defaults, ad-hoc for schema changes |
| **Obsidian** | Manual "Update all" button | `Object.assign(DEFAULT, saved)` convention | Shallow merge preserves flat keys; nested objects fully replaced | Manual click, no in-app changelogs |
| **Homebrew** | `brew outdated` → `brew upgrade` | `.default` file pattern — new config saved alongside, user file untouched | Never overwrites modified files | Safe but requires manual diff |
| **ESLint/Prettier** | `npm outdated` / Dependabot | None (cascade handles it) | **Last-wins cascade** — shared config rules set first, user `rules` override | Explicit, reviewable, pin-and-bump |
| **Terraform** | Lock file + explicit `-upgrade` | **Versioned StateUpgraders** — schema version stamps, migration functions run automatically | State auto-migrated, `.tf` config never touched | Highly deliberate, auditable |

**Two patterns directly applicable to mk-flow:**

1. **ESLint's layered cascade:** Ship defaults separately from user overrides. Merge at runtime with user-wins semantics. Upstream changes flow in automatically without clobbering customizations. This is exactly what mk-flow's hook already does — it reads defaults AND project files, injecting both. The `/mk-flow-update` skill would apply this pattern to persistent files.

2. **Terraform's versioned state migration:** Stamp context files with a version marker. When defaults change, compare versions and apply the appropriate transformations. Unlike Terraform's complex upgrader chain, mk-flow's case is simpler — entries are keyed YAML, so key-based merge with source tagging covers it.

**Bottom line:** The ESLint cascade (last-wins, layered) is the right merge model. Terraform's version stamp (`_meta.defaults_version`) enables stale detection. Homebrew's `.default` pattern is a useful fallback for truly conflicting changes.

---

## Per-Project Default Syncing: The Hard Problem

mk-flow creates 5 context files at init time. Each has different update characteristics:

| File | Source of defaults | User customizations | Merge strategy |
|------|-------------------|--------------------|---------------|
| `context/rules.yaml` | `plugins/mk-flow/defaults/rules.yaml` | Project-specific rules added from corrections | Key-based merge — match by rule name |
| `.claude/mk-flow/intents.yaml` | `plugins/mk-flow/intent-library/defaults.yaml` | Project-specific intents, corrections list | Key-based merge — match by intent name, never touch corrections |
| `context/cross-references.yaml` | Bootstrapped from CLAUDE.md + structural scan | Rules grow from corrections during work | Additive merge — add missing default rules with `source: "plugin-default"` tag |
| `context/vocabulary.yaml` | Empty template | Auto-populated from user corrections | No sync needed — purely project-specific |
| `context/STATE.md` | Bootstrapped from project scan | Always project-specific | Never synced |

**The existing mk-flow-update-rules pattern works.** It:
1. Reads plugin defaults
2. Reads project file
3. For each entry: same content → keep; different content → take plugin version; new in plugin → add; only in project → keep
4. Shows what changed

This pattern extends directly to intents.yaml and cross-references.yaml. The merge semantics per file:

**Rules:** Simple key-based merge. Plugin defaults always win for shared keys. Project-only keys preserved.

**Intents:** Key-based merge with a wrinkle — the `corrections` list is append-only and project-specific. Merge must: update shared intents with plugin defaults, add new plugin intents, keep project-only intents, NEVER touch corrections.

**Cross-references:** The `source` field enables safe merging. Rules with `source: "CLAUDE.md Change Impact Map"` or `source: "plugin-default"` can be updated from defaults. Rules without a source field are project-specific — never touched.

**Version marker enables stale detection.** Add `_meta` to all syncable context files:

```yaml
_meta:
  defaults_version: "0.4.0"  # which mk-flow version these defaults came from
  last_synced: "2026-03-19"
```

This lets the sync skill and the hook both detect: "This project was initialized from mk-flow 0.3.0. Defaults changed in 0.4.0."

**Bottom line:** The merge pattern generalizes cleanly from rules to all context files. Add `_meta.defaults_version` and build a unified `/mk-flow-update` skill.

---

## Version Tracking Strategy: What Goes Where

**Per-plugin plugin.json (required — this is what CC reads):**
```json
{
  "name": "ladder-build",
  "version": "1.2.0",
  "description": "..."
}
```

**marketplace.json (derived — must mirror plugin.json versions):**
Already tracked by the `plugin-version-bump` cross-reference rule. `plugin.json` wins when they disagree, but keeping them in sync avoids confusion for marketplace browsers.

**Git tags (recommended — `plugin@version` format):**
The established monorepo convention: `mk-flow@0.4.0`, `ladder-build@1.2.0`. Enables `git log mk-flow@0.3.0..mk-flow@0.4.0 -- plugins/mk-flow/` for per-plugin history.

**RELEASE-NOTES.md — per plugin:**
Each plugin is independently installable, so each gets its own changelog. Format follows superpowers: `## v0.4.0 (2026-03-15)` headers with categorized changes.

**Changelog generation — git-cliff as optional accelerator:**
For when hand-writing feels tedious, [git-cliff](https://git-cliff.org/) is a standalone Rust binary with native monorepo support:
```bash
# Generate changelog for a specific plugin from conventional commits
git-cliff --include-path "plugins/mk-flow/**" -o plugins/mk-flow/RELEASE-NOTES.md
```
- Installable via `winget install orhun.git-cliff` on Windows
- No ecosystem lock-in (not npm, not Python — single binary)
- Works alongside hand-written entries (you can edit the output)
- Optional — not a dependency, just a convenience

**Versioning scheme:**
- Semver (major.minor.patch)
- Patch: bug fixes, wording changes
- Minor: new features, new rules, new intents (backward compatible)
- Major: breaking changes to skill behavior, hook protocol changes, context file format changes

**Bottom line:** Add `version` to every plugin.json, create per-plugin `RELEASE-NOTES.md`, tag with `plugin@version`. git-cliff available as optional accelerator.

---

## User Experience: What the Update Flow Feels Like

Three layers of the update experience:

### Layer 1: Plugin updates (CC handles this — with caveats)

Once all plugins have version fields, this works:
1. User starts a CC session
2. CC refreshes marketplace repo (**only if auto-update enabled — disabled by default for third-party**)
3. CC detects version mismatch
4. CC updates plugin cache with new version
5. User sees updated skills/hooks on next session

**Important:** Users of your plugins must either:
- Enable auto-update: configure `autoUpdate: true` for the mk-cc-resources marketplace
- Or manually run: `claude plugin update mk-cc-all` (or `mk-flow`, `alert-sounds`)

**Gap:** No "what's new" notification. Users see an update happened but not what changed.

### Layer 2: mk-flow context sync (needs building)

After plugin files update, per-project context files are stale.

**Explicit `/mk-flow-update` command:**
- User runs `/mk-flow-update` when they want to sync
- Shows what would change (diff preview by file), asks for confirmation
- Applies changes, shows summary: "Updated 2 rules, added 1 intent, 3 project-specific rules kept"
- User stays in control

**Automatic nudge (enhancement):**
- mk-flow's hook compares `_meta.defaults_version` with installed mk-flow version
- If stale, injects a one-line note: `[mk-flow] Defaults updated (0.3.0 → 0.4.0). Run /mk-flow-update to sync.`
- Appears once per session (flag file in temp dir), not every message
- Dismissable via `_meta.dismissed_version` in project config

### Layer 3: What's new

- `RELEASE-NOTES.md` in each plugin directory — always available
- `/mk-flow-update` shows what changed as part of its sync output
- Hook nudge includes version range: "0.3.0 → 0.4.0" so user knows the scope

**Bottom line:** Explicit command + hook nudge is the right balance. No silent changes.

---

## Design Decisions: Key Forks

### 1. Unified `/mk-flow-update` vs separate update skills per file
**Unified.** One command syncs everything. `/mk-flow-update-rules` becomes an internal step. Users care about "am I up to date?", not individual files.

### 2. Version source: marketplace.json vs individual plugin.json
**Individual plugin.json is authoritative.** CC reads it with priority. marketplace.json is derived and must be kept in sync (cross-reference rule enforces this).

### 3. Changelog format: auto-generated vs hand-written
**Hand-written RELEASE-NOTES.md, with git-cliff as optional accelerator.** Hand-written entries have more context and value. git-cliff can generate a first draft that you edit. No mandatory tooling dependency.

### 4. When to bump versions
**Bump on every push that changes plugin behavior.** Not every commit — batch related changes. The `plugin-version-bump` cross-reference rule already reminds you.

### 5. Merge strategy for context sync
**Key-based merge with source tags.** Following ESLint's last-wins cascade model adapted for YAML: match entries by key, plugin defaults update shared keys, project-only keys preserved. Source tags (`source: "plugin-default"`) distinguish updatable entries from project-specific ones.

### 6. _meta version tracking in context files
**Add `_meta` section to all syncable context files.** Inspired by Terraform's schema versioning. Minimal overhead, enables stale detection. Format:
```yaml
_meta:
  defaults_version: "0.4.0"
  last_synced: "2026-03-19"
```

---

## Solutions

### Solution A: Lean Convention (Superpowers Pattern)

**What it is:** Follow the superpowers plugin convention exactly. Add version to every plugin.json, create RELEASE-NOTES.md per plugin, tag git releases. Expand `/mk-flow-update-rules` to `/mk-flow-update` covering all context files.

**Why it works:** CC's plugin system already handles the hard part (detection, caching, updating). This fills the authoring-side gaps with zero external tooling.

**Key components:**
- `version` field in every `plugins/*/.claude-plugin/plugin.json` — enables CC update detection
- `RELEASE-NOTES.md` per plugin — human-written changelog following superpowers format
- Git tags (`plugin@version`) — enables per-plugin history browsing
- `/mk-flow-update` skill — unified context file sync with key-based merge, diff preview, confirmation
- `_meta.defaults_version` in context files — stale detection

**Dependencies:** None. Pure convention + one skill file.

**Pitfalls:**
- Version bumps require discipline — easy to forget when pushing quickly. Mitigated by existing `plugin-version-bump` cross-reference rule.
- RELEASE-NOTES.md requires manual effort per release. Mitigated by low release frequency.

**Hard limits:** No automatic "what's new" notification — users must run `/mk-flow-update` or check RELEASE-NOTES.md.

**Effort:** S — Add version fields + RELEASE-NOTES.md skeletons (~1 hour), build `/mk-flow-update` skill (2-3 milestones).

---

### Solution B: Lean Convention + Automatic Nudge

**What it is:** Everything in Solution A, plus the mk-flow hook detects stale defaults and nudges the user on session start.

**Why it works:** Combines manual changelogs with automatic discoverability. Users don't have to remember to check.

**Key components:**
- Everything from Solution A
- mk-flow hook enhancement: compare `_meta.defaults_version` in project context files with installed mk-flow version (read from `${CLAUDE_PLUGIN_ROOT}/../plugin.json` or a version file in defaults/)
- If stale, inject: `[mk-flow] Defaults updated (0.3.0 → 0.4.0). Run /mk-flow-update to sync.`
- Session-aware: check once per session via temp flag file, not every message
- Dismissable: `_meta.dismissed_version` skips the nudge for a specific version

**Dependencies:** mk-flow hook must read the installed plugin version. Available via `${CLAUDE_PLUGIN_ROOT}` env var (points to the versioned cache dir, version extractable from path).

**Pitfalls:**
- Hook stale check must be fast (file read + string compare). No git operations.
- Nudge could feel nagging. Mitigated by dismiss mechanism and once-per-session check.

**Hard limits:** `${CLAUDE_PLUGIN_ROOT}` changes when a plugin updates (points to new version directory). The hook must handle this gracefully.

**Effort:** M — Everything in Solution A plus hook modifications and session-aware stale detection.

---

### Solution C: Lean Convention + Auto-Sync Non-Conflicting Changes

**What it is:** Everything in Solution B, plus the hook automatically applies non-conflicting updates without user intervention. Only prompts for conflicts.

**Why it works:** For purely additive changes (new rules that don't exist in the project), there's no risk of data loss.

**Key components:**
- Everything from Solution B
- Hook auto-applies new entries (not in project file) on version mismatch
- Conflicts (same key, different content) queued for manual review: "Auto-applied 2 new rules. 1 conflict — run /mk-flow-update."

**Dependencies:** Hook must write to project context files. Currently read-only.

**Pitfalls:**
- Auto-modification from a hook violates principle of least surprise.
- Error handling in hooks is limited — failed write could corrupt context files.
- Makes debugging harder — "where did this rule come from?"

**Hard limits:** Hook execution time constrained. YAML parsing + writing adds latency to first message.

**Effort:** L — Everything in Solution B plus hook write capabilities, conflict detection, error handling.

---

### Solutions Compared

| Aspect | A: Lean Convention | B: Lean + Nudge | C: Lean + Auto-Sync |
|--------|-------------------|-----------------|---------------------|
| Effort | S | M | L |
| Dependencies | None | Hook reads plugin version | Hook writes project files |
| User awareness | Passive (must check) | Active (told on session start) | Active + automatic |
| Risk of surprise | None | Low (notification only) | Medium (files change) |
| Maintainability | Trivial | Low | Medium |
| Biggest risk | Users forget to update | Nudge feels nagging | Silent changes surprise users |
| Best when... | Solo dev who checks regularly | Multiple projects, wants reminders | Many projects, zero friction |

**Recommendation:** **Solution B (Lean Convention + Automatic Nudge).** Right balance: zero external tooling, automatic update discovery, user stays in control. Solution C adds complexity for marginal benefit.

---

## Next Steps — Toward the Full Solution

1. **Add version fields to all 7 plugin.json files missing them** — Align with marketplace.json versions. Fix the mk-cc-all/mk-flow version drift in marketplace.json. *(Starting now)*
2. **Create RELEASE-NOTES.md for mk-flow and mk-cc-all** — Retroactively document recent releases from git history. Other plugins start with skeleton.
3. **Add `_meta.defaults_version` to mk-flow default templates** — New projects get the version marker from day one.
4. **Build `/mk-flow-update` skill** — Expand mk-flow-update-rules to cover all context files. Key-based merge with diff preview and confirmation.
5. **Add stale detection to mk-flow hook** — Compare `_meta.defaults_version` with installed version on first message per session. Show nudge if stale.
6. **Tag existing versions in git** — `plugin@version` tags for the current state of each plugin.

**Recommended path:** Steps 1-2 are pure convention (no code). Then build `/mk-flow-update` skill via ladder-build. Hook nudge comes last.

### Build Plans

| Plan | Goal | Milestones | Effort | Depends On |
|------|------|------------|--------|------------|
| Version hygiene | Every plugin has version in plugin.json, marketplace.json aligned, git tags created | 1 | S | None |
| Release notes | RELEASE-NOTES.md for all plugins with retroactive history | 1 | S | Version hygiene |
| mk-flow-update skill | Unified `/mk-flow-update` that syncs all context files with merge, diff preview, confirmation | 3 | M | Version hygiene |
| Stale detection nudge | mk-flow hook detects outdated defaults and nudges user on session start | 2 | M | mk-flow-update skill |

**Recommended order:** Version hygiene → Release notes → mk-flow-update skill → Stale detection nudge

---

## Sources

**Local filesystem analysis (2026-03-19):**
- `~/.claude/plugins/installed_plugins.json` — plugin version tracking
- `~/.claude/plugins/known_marketplaces.json` — marketplace refresh dates
- `~/.claude/plugins/cache/` — versioned plugin cache structure
- `~/.claude/plugins/marketplaces/mk-cc-resources/` — git reflog analysis
- Superpowers plugin v5.0.2 — `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.2/`

**Claude Code plugin documentation:**
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference) — accessed 2026-03-19
- [Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) — accessed 2026-03-19
- [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins) — accessed 2026-03-19
- [Third-party marketplace auto-update issue #26744](https://github.com/anthropics/claude-code/issues/26744) — auto-update disabled by default
- [Plugin update detection issue #31462](https://github.com/anthropics/claude-code/issues/31462) — update workflow

**Prior art — ecosystem documentation:**
- [VS Code Extension Marketplace](https://code.visualstudio.com/docs/editor/extension-marketplace) — accessed 2026-03-19
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) — layered settings model
- [Obsidian Community Plugins](https://help.obsidian.md/community-plugins) — accessed 2026-03-19
- [Obsidian Plugin Settings docs](https://docs.obsidian.md/Plugins/User+interface/Settings) — Object.assign pattern
- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook) — .default config pattern
- [ESLint flat config](https://eslint.org/blog/2022/08/new-config-system-part-2/) — layered cascade
- [ESLint flat config extends](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/) — last-wins semantics
- [Prettier sharing configurations](https://prettier.io/docs/sharing-configurations) — config cascade
- [typescript-eslint versioning policy](https://typescript-eslint.io/users/versioning/) — semver for rule changes
- [Terraform provider versioning](https://developer.hashicorp.com/terraform/tutorials/configuration-language/provider-versioning) — lock file pattern
- [Terraform state upgrade](https://developer.hashicorp.com/terraform/plugin/framework/resources/state-upgrade) — versioned migration
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock) — pinning + checksums

**Version tracking & changelog tools:**
- [git-cliff](https://git-cliff.org/) — standalone changelog generator with monorepo support
- [git-cliff monorepo docs](https://git-cliff.org/docs/usage/monorepos/) — `--include-path` for scoped changelogs
- [release-please manifest](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md) — GitHub Action for monorepo releases
- [Cocogitto monorepo guide](https://docs.cocogitto.io/guide/monorepo.html) — full conventional-commits toolbox
- [Nx versioning blog](https://nx.dev/blog/versioning-and-releasing-packages-in-a-monorepo) — monorepo strategies
