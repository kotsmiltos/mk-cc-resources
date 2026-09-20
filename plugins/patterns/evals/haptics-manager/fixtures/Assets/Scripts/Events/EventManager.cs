using System;
using System.Collections.Generic;
using UnityEngine;

namespace Zarmada.Events
{
    /// <summary>
    /// Typed event bus. Removal during dispatch is queued and applied after the dispatch loop,
    /// so a listener may unsubscribe itself from inside its own callback.
    /// Subscribe in OnEnable, unsubscribe in OnDisable — always in pairs.
    /// </summary>
    public static class EventManager
    {
        private static readonly Dictionary<object, List<Delegate>> Listeners = new Dictionary<object, List<Delegate>>();
        private static readonly List<(object id, Delegate handler)> PendingRemovals = new List<(object, Delegate)>();
        private static int _dispatchDepth;

        public static void AddListener<T>(EventID<T> id, Action<T> handler)
        {
            if (!Listeners.TryGetValue(id, out var list))
            {
                list = new List<Delegate>();
                Listeners[id] = list;
            }
            if (!list.Contains(handler)) list.Add(handler);
        }

        public static void RemoveListener<T>(EventID<T> id, Action<T> handler)
        {
            if (_dispatchDepth > 0)
            {
                PendingRemovals.Add((id, handler));
                return;
            }
            if (Listeners.TryGetValue(id, out var list)) list.Remove(handler);
        }

        public static void Dispatch<T>(EventID<T> id, T payload)
        {
            if (!Listeners.TryGetValue(id, out var list) || list.Count == 0) return;
            _dispatchDepth++;
            try
            {
                for (int i = 0; i < list.Count; i++)
                {
                    try
                    {
                        ((Action<T>)list[i])(payload);
                    }
                    catch (Exception e)
                    {
                        Debug.LogException(e);
                    }
                }
            }
            finally
            {
                _dispatchDepth--;
                if (_dispatchDepth == 0) ApplyPendingRemovals();
            }
        }

        private static void ApplyPendingRemovals()
        {
            foreach (var (id, handler) in PendingRemovals)
            {
                if (Listeners.TryGetValue(id, out var list)) list.Remove(handler);
            }
            PendingRemovals.Clear();
        }
    }
}
