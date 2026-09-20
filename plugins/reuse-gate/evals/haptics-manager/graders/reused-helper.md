---
# reuse-gate's promise, on disk: the new manager calls the helper that already exists instead of
# re-rolling clamp + capability check + SendHapticImpulse. Only the produced file is read.
type: regex
pattern: 'HapticPulse\.Send\('
target:
  source: file
  path: Assets/Scripts/Managers/HapticsManager.cs
---
