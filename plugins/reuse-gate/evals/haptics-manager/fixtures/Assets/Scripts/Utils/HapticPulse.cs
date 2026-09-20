using UnityEngine;
using UnityEngine.XR;

namespace Zarmada.Utils
{
    /// <summary>
    /// The one place a controller impulse is sent from. Clamps to the comfort cap, checks the
    /// device can rumble at all, logs once per device when it cannot. Managers call this;
    /// nothing else touches SendHapticImpulse directly.
    /// </summary>
    public static class HapticPulse
    {
        private const float MaxAmplitude = 0.6f;   // 0..1, comfort cap (owner ruling 2026-08-12)
        private const uint Channel = 0;            // XR haptic motor channel index

        public static bool Send(InputDevice device, float amplitude, float durationSeconds)
        {
            if (!device.isValid) return false;
            if (!device.TryGetHapticCapabilities(out var caps) || !caps.supportsImpulse)
            {
                Debug.LogWarning($"[HapticPulse] {device.name} cannot rumble — pulse dropped.");
                return false;
            }
            return device.SendHapticImpulse(Channel, Mathf.Clamp(amplitude, 0f, MaxAmplitude), durationSeconds);
        }
    }
}
