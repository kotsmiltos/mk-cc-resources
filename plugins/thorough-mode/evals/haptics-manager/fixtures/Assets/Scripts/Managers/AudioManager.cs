using UnityEngine;
using Zarmada.Core;
using Zarmada.Events;

namespace Zarmada.Managers
{
    /// <summary>
    /// Reference manager: the shape every manager in this toolkit follows.
    /// Singleton&lt;T&gt; base, [SerializeField] wiring, symmetric subscribe/unsubscribe in
    /// OnEnable/OnDisable, named constants with unit comments, pause-aware via the event bus.
    /// </summary>
    public sealed class AudioManager : Singleton<AudioManager>
    {
        private const float GrabClipVolume = 0.8f;      // 0..1 linear gain
        private const float DuckedVolume = 0.25f;       // 0..1 linear gain while paused
        private const float DuckFadeSeconds = 0.15f;    // seconds

        [SerializeField] private AudioSource _sfxSource;
        [SerializeField] private AudioClip _grabClip;

        private bool _isPaused;

        #region Lifecycle

        private void OnEnable()
        {
            EventManager.AddListener(GameEvents.GrabStarted, OnGrabStarted);
            EventManager.AddListener(GameEvents.PauseChanged, OnPauseChanged);
        }

        private void OnDisable()
        {
            EventManager.RemoveListener(GameEvents.GrabStarted, OnGrabStarted);
            EventManager.RemoveListener(GameEvents.PauseChanged, OnPauseChanged);
        }

        #endregion

        #region Event handlers

        private void OnGrabStarted(GrabEvent e)
        {
            if (_isPaused || _grabClip == null) return;
            _sfxSource.PlayOneShot(_grabClip, GrabClipVolume);
        }

        private void OnPauseChanged(PauseChangedEvent e)
        {
            _isPaused = e.IsPaused;
            _sfxSource.volume = e.IsPaused ? DuckedVolume : 1f;
        }

        #endregion
    }
}
