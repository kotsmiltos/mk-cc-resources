using System.Collections.Generic;
using UnityEngine;
using Zarmada.Core;
using Zarmada.Events;

namespace Zarmada.Managers
{
    /// <summary>Who is asking for a pause. Several may hold it at once; unpause only when none do.</summary>
    public enum PauseReason
    {
        HeadsetRemoved,
        Instructor,
        Menu,
    }

    /// <summary>
    /// Multi-reason pause: a List of reasons rather than a bool, because the headset, the
    /// instructor and the menu each pause independently and must each release independently.
    /// </summary>
    public sealed class PauseManager : Singleton<PauseManager>
    {
        private readonly List<PauseReason> _reasons = new List<PauseReason>();

        public bool IsPaused => _reasons.Count > 0;

        public void RequestPause(PauseReason reason)
        {
            if (_reasons.Contains(reason)) return;
            bool wasPaused = IsPaused;
            _reasons.Add(reason);
            if (!wasPaused) EventManager.Dispatch(GameEvents.PauseChanged, new PauseChangedEvent { IsPaused = true });
        }

        public void ReleasePause(PauseReason reason)
        {
            if (!_reasons.Remove(reason)) return;
            if (!IsPaused) EventManager.Dispatch(GameEvents.PauseChanged, new PauseChangedEvent { IsPaused = false });
        }
    }
}
