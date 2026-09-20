---
name: haptics-manager
description: Design-shaped ask ("add a haptics manager" — verb + list noun, so the seam menu fires WITH patterns). The promise graded — name the varying axis and pick a seam or consciously close it — is an LLM read of the trace; the house rules are the control.
tags: [design]
runs: 3
max_turns: 20
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

Add a haptics manager to this toolkit. On GameEvents.GrabStarted pulse the grabbing hand's
controller; on GrabEnded give a shorter, softer pulse; never pulse while the sim is paused. We
will add more pulse kinds later (teleport, menu confirm, damage). Amplitude and durations must
be designer-tunable, not constants in the manager. Follow the toolkit's own conventions — read
the existing managers first. The manager goes in Assets/Scripts/Managers/HapticsManager.cs; put
its tunables wherever the toolkit's conventions say. There is no Unity editor here: write the
C# files only, under Assets/Scripts/.
