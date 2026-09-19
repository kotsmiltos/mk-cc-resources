---
kind: semantic
caste: project
title: Haptics manager config and amplitude decisions
themes: [haptics, manager, config, controller, pulse]
---

# Haptics manager config and amplitude decisions

Two owner rulings that the code does not show yet (no config asset exists in the toolkit so far):

1. **Designer-tunable values live in a ScriptableObject under `Assets/Scripts/Config/`**, created
   through `[CreateAssetMenu(menuName = "Zarmada/Config/<Name>")]`, where `<Name>` is the
   concern (Audio, Haptics, …). The manager holds it as a `[SerializeField]` and reads it;
   never inline tunables, never a second config idiom.
2. **Controller haptic amplitude is capped at 0.6 on the 0..1 scale** (owner ruling
   2026-08-12, after the comfort tests on the Quest 3 cohort). Declare the cap as a named
   float constant with a unit comment (`// 0..1, comfort cap`) and clamp every pulse against
   it — the config value is a request, the cap is law.
