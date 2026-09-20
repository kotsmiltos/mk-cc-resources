---
# Grades what `++` PROMISES (thorough-mode/CLAUDE.md): ENUMERATE the request's items before
# acting, WORK each one, and EXIT with every item closed against evidence. It does not grade
# "verified done" — measured 2026-09-20: ++ produced itemised closes 3/3 while a verified-done
# rubric scored it 0/3, so that rubric was measuring a want ++ never claimed.
type: llm
focus: trace
---

You are judging whether the assistant followed an enumerate-first protocol on this request. The
request contained these distinct items: (a) pulse on GrabStarted, (b) a shorter AND softer pulse
on GrabEnded, (c) no pulse while the sim is paused, (d) amplitude and both durations designer-
tunable and not constants in the manager, (e) follow the toolkit's own conventions after reading
the existing managers, (f) the manager at Assets/Scripts/Managers/HapticsManager.cs, (g) C# files
only under Assets/Scripts/.

PASS only if BOTH hold:
1. BEFORE its first Write or Edit, the assistant wrote out an explicit list (numbered or
   bulleted, in its own text) of at least five of those items as things to do or check — the
   request treated as a checklist, not paraphrased in one sentence.
2. Its final message closes the items one by one: for at least five of them it states what was
   done, and no item is dismissed with "the rest are similar" or left unmentioned.

FAIL if it started writing code without listing the items, or if the final message is a prose
summary that does not close the items individually.
