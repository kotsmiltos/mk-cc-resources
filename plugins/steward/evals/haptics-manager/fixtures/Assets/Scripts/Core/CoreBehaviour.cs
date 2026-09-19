using UnityEngine;

namespace Zarmada.Core
{
    /// <summary>
    /// Sealed-lifecycle base for every behaviour in the toolkit. Unity's magic methods are
    /// sealed here so a subclass cannot forget base.Awake(); subclasses override the On* virtuals.
    /// </summary>
    public abstract class CoreBehaviour : MonoBehaviour
    {
        #region Unity lifecycle (sealed)

        private void Awake()
        {
            OnAwake();
        }

        private void Start()
        {
            OnStart();
        }

        private void Update()
        {
            OnUpdate(Time.deltaTime);
        }

        private void OnDestroy()
        {
            OnDestroyed();
        }

        #endregion

        #region Overridable hooks

        protected virtual void OnAwake() { }
        protected virtual void OnStart() { }
        protected virtual void OnUpdate(float deltaTime) { }
        protected virtual void OnDestroyed() { }

        #endregion
    }
}
