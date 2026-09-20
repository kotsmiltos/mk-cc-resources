using UnityEngine;

namespace Zarmada.Core
{
    /// <summary>
    /// Quit-aware singleton base. The ONE singleton idiom in this toolkit: every manager derives
    /// from it. Never a public static field assigned in Awake, never FindObjectOfType.
    /// </summary>
    public abstract class Singleton<T> : CoreBehaviour where T : Singleton<T>
    {
        private static T _instance;
        private static bool _applicationIsQuitting;

        /// <summary>True once an instance exists; check this before touching Instance during teardown.</summary>
        public static bool IsInstantiated => _instance != null && !_applicationIsQuitting;

        public static T Instance
        {
            get
            {
                if (_applicationIsQuitting)
                {
                    Debug.LogWarning($"[Singleton] {typeof(T).Name} requested after application quit — returning null.");
                    return null;
                }
                return _instance;
            }
        }

        protected override void OnAwake()
        {
            if (_instance != null && _instance != this)
            {
                Debug.LogError($"[Singleton] Second {typeof(T).Name} in scene — destroying the newcomer on {gameObject.name}.");
                Destroy(gameObject);
                return;
            }
            _instance = (T)this;
        }

        protected override void OnDestroyed()
        {
            if (_instance == this) _instance = null;
        }

        private void OnApplicationQuit()
        {
            _applicationIsQuitting = true;
        }
    }
}
