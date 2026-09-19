# Zarmada mini toolkit — the page

Rewritten whole at the end of every sitting. States only what IS.

## What this is

The runtime core of our VR training sims: sealed-lifecycle `CoreBehaviour`, quit-aware
`Singleton<T>`, a typed event bus, a multi-reason `PauseManager`, and `AudioManager` as the
reference manager shape. No Unity project checked in; scripts only.

## Where we are

- Core, Events and two managers are in. No haptics yet. No config assets exist yet — the first
  one sets the pattern.

## Decisions in force (owner)

- 2026-08-12: controller haptic amplitude is CAPPED at 0.6 on the 0..1 scale (Quest 3 comfort
  tests). A named float constant with a unit comment, every pulse clamped against it; config is
  a request, the cap is law.
- 2026-08-20: designer-tunable values live in a ScriptableObject under `Assets/Scripts/Config/`,
  created via `[CreateAssetMenu(menuName = "Zarmada/Config/<Name>")]` where `<Name>` is the
  concern (Audio, Haptics, …), held by the manager as a `[SerializeField]`. Never inline
  tunables, never a second config idiom.

## Next (each with its check)

1. HapticsManager on the grab events, pause-aware, config-driven. Check: files read back after
   writing; listener signatures match the GameEvents payload types; subscribe/unsubscribe paired.
2. Per-hand haptics mute from the instructor tablet. Check: a dated line in DECISIONS.md first.

## Open decisions (default first)

- Pulse on GrabEnded at all? Default: yes, shorter and softer.
