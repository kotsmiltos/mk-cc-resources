namespace Zarmada.Events
{
    /// <summary>
    /// A strongly-typed event key. Declare them once, as static readonly fields on GameEvents,
    /// so a listener and a dispatcher can never disagree about the payload type.
    /// </summary>
    public sealed class EventID<TPayload>
    {
        public string Name { get; }

        public EventID(string name)
        {
            Name = name;
        }

        public override string ToString() => $"EventID<{typeof(TPayload).Name}>({Name})";
    }
}
