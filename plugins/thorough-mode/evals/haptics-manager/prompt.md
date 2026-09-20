---
name: haptics-manager
description: A real toolkit task in the owner's Unity/XR house style with @verify on the prompt (++ retired 2026-09-20). Graded on the house conventions, the two decisions that live outside the code (unreachable here — no note — so a control), and a verified done, which is what @verify promises.
tags: [verified-done]
runs: 3
max_turns: 20
timeout_seconds: 900
allowed_tools: [Read, Write, Edit, Glob, Grep]
---

@verify Add a HapticsManager to this toolkit. On GameEvents.GrabStarted pulse the grabbing
hand's controller; on GrabEnded give a shorter, softer pulse; never pulse while the sim is
paused. Amplitude and both durations must be designer-tunable, not constants in the manager.
Follow the toolkit's own conventions — read the existing managers first. The manager goes in
Assets/Scripts/Managers/HapticsManager.cs; put its tunables wherever the toolkit's conventions say.
There is no Unity editor here: write the C# files only, under Assets/Scripts/.
