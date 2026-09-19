---
type: regex
pattern: 'FindObjectOfType|GameObject\.Find\(|FindAnyObjectByType|FindFirstObjectByType'
match: not_contains
target:
  source: file
  path: Assets/Scripts/Managers/HapticsManager.cs
---
