using UnityEngine;
using UnityEngine.XR;

namespace Zarmada.Events
{
    /// <summary>Which hand an interaction came from. Mirrors XRNode for the two controllers.</summary>
    public enum Hand
    {
        Left,
        Right,
    }

    /// <summary>Payload for grab start/end. The hand's XR device is resolved by the dispatcher.</summary>
    public struct GrabEvent
    {
        public Hand Hand;
        public GameObject Item;
        public InputDevice Device;
    }

    /// <summary>Payload for pause changes. True while any pause reason is held.</summary>
    public struct PauseChangedEvent
    {
        public bool IsPaused;
    }

    /// <summary>The toolkit's event keys. One place, strongly typed; add new keys here.</summary>
    public static class GameEvents
    {
        public static readonly EventID<GrabEvent> GrabStarted = new EventID<GrabEvent>("GrabStarted");
        public static readonly EventID<GrabEvent> GrabEnded = new EventID<GrabEvent>("GrabEnded");
        public static readonly EventID<PauseChangedEvent> PauseChanged = new EventID<PauseChangedEvent>("PauseChanged");
    }
}
