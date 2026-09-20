---
name: haptics-manager
description: The toolkit already ships Assets/Scripts/Utils/HapticPulse.cs (clamp + capability check + the one SendHapticImpulse call site). reuse-gate's promise — search before writing, say which rung you rejected — is graded by whether the new manager calls HapticPulse.Send instead of re-rolling it.
tags: [reuse]
runs: 3
max_turns: 20
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add a HapticsManager to this toolkit. On GameEvents.GrabStarted pulse the grabbing hand's
controller; on GrabEnded give a shorter, softer pulse; never pulse while the sim is paused.
Amplitude and both durations must be designer-tunable, not constants in the manager. Follow the
toolkit's own conventions — read the existing managers first. The manager goes in
Assets/Scripts/Managers/HapticsManager.cs; put its tunables wherever the toolkit's conventions say.
There is no Unity editor here: write the C# files only, under Assets/Scripts/.
