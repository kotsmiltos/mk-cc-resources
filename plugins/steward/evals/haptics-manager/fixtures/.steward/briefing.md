# Zarmada mini toolkit — briefing

## Where we are
- Core, Events and two managers (Pause, Audio) are in; `AudioManager` is the reference shape.
- No haptics yet. No config assets exist yet either — the first one sets the pattern.

## Decisions in force (owner)
- 2026-08-12: controller haptic amplitude is CAPPED at 0.6 on the 0..1 scale after the Quest 3
  comfort tests. A named float constant with a unit comment (`// 0..1, comfort cap`), and every
  pulse clamps against it — a config value is a request, the cap is law.
- 2026-08-20: designer-tunable values live in a ScriptableObject under `Assets/Scripts/Config/`,
  created through `[CreateAssetMenu(menuName = "Zarmada/Config/<Name>")]` where `<Name>` is the
  concern (Audio, Haptics, …); the manager holds it as a `[SerializeField]`. Never inline
  tunables, never a second config idiom.

## Next
1. HapticsManager on the grab events, pause-aware, config-driven (check: files read back, event
   signatures match GameEvents payload types, subscribe/unsubscribe paired).
