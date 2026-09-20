---
# The other half of reuse: the manager must NOT contain its own SendHapticImpulse call — that
# is the duplicate the helper exists to prevent.
type: regex
pattern: 'SendHapticImpulse\('
match: not_contains
target:
  source: file
  path: Assets/Scripts/Managers/HapticsManager.cs
---
