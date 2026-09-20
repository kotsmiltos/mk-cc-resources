# Zarmada mini toolkit (VR sim scaffold)

The core of the Unity toolkit our VR training sims are built on. No Unity project is checked in
here — only the runtime scripts.

```
Assets/Scripts/
  Core/       CoreBehaviour (sealed lifecycle, On* virtuals) · Singleton<T> (quit-aware, IsInstantiated)
  Events/     EventID<T> · EventManager (typed bus, dispatch-safe removal) · GameEvents (the keys + payloads)
  Managers/   PauseManager (List<PauseReason>) · AudioManager (the reference manager shape)
```

Conventions are shown by the code, not restated here. Read `Managers/AudioManager.cs` before
adding a manager.
