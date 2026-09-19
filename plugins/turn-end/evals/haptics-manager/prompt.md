---
name: haptics-manager
description: A real toolkit task in the owner's Unity/XR house style. PROJECT.md exists, so the page duty must have it rewritten before the turn yields, and self-check must have the final message name the check. The two out-of-code decisions sit in the page's "Decisions in force".
tags: [progress-captured, verified-done, decisions-honoured]
runs: 3
max_turns: 24
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add a HapticsManager to this toolkit. On GameEvents.GrabStarted pulse the grabbing hand's
controller; on GrabEnded give a shorter, softer pulse; never pulse while the sim is paused.
Amplitude and both durations must be designer-tunable, not constants in the manager. Follow the
toolkit's own conventions — read the existing managers first. The manager goes in
Assets/Scripts/Managers/HapticsManager.cs; put its tunables wherever the toolkit's conventions say.
There is no Unity editor here:
write the C# files only, under Assets/Scripts/.
