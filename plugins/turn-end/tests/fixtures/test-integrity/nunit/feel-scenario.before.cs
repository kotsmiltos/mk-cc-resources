// REAL sample, trimmed: one of the owner's game projects, TwinFeelScenarioTests.cs BEFORE the
// round-1 commit of 2026-09-30 01:35 (+0300). Assertion lines, messages, attributes and test names
// are verbatim; long comments and unrelated tests were cut. Paths and ids removed.

using NUnit.Framework;
using UnityEngine;

namespace TwinGame.EditTests
{
    public class TwinFeelScenarioTests
    {
        // ===============================================================================
        // (a) full throttle + rider full-back → wheelie, on the Twin's 330 Nm.
        // ===============================================================================

        [Test]
        public void S32a_FullThrottle_RiderFullBack_Wheelies()
        {
            Rig rig = Settled();
            bool lifted = false;
            for (int i = 0; i < LiftWindowTicks && !lifted; i++)
            {
                rig.Loop.State.Throttle = 1f;
                HoldRider(rig.Loop.State, new Vector2(0f, -1f));
                rig.Loop.Step();
                lifted |= !rig.Loop.State.Wheels[Wheel.Front].HasContact;
            }
            Assert.IsTrue(lifted,
                "Full throttle with the rider hanging fully back must lift the Twin's front "
                + "wheel within three seconds — the owner's constraint (a), on the shipped "
                + "220 kg / 330 Nm numbers, not the donor's.");
        }

        [Test]
        public void S32a_FullThrottle_RiderCentred_StaysDown()
        {
            Rig rig = Settled();
            bool lifted = false;
            for (int i = 0; i < LiftWindowTicks; i++)
            {
                rig.Loop.State.Throttle = 1f;
                HoldRider(rig.Loop.State, Vector2.zero);
                rig.Loop.Step();
                lifted |= !rig.Loop.State.Wheels[Wheel.Front].HasContact;
            }
            Assert.IsFalse(lifted,
                "Full throttle with a centred rider must NOT wheelie the Twin — if power "
                + "alone lifts it, the stance mechanic is a spectator.");
        }

        // ===============================================================================
        // (c) front brake alone + rider upright → stoppie.
        // ===============================================================================

        [Test]
        public void S32c_FrontBrakeOnly_RiderUpright_Stoppies()
        {
            Rig rig = Settled();
            rig.Body.SetVelocityForScenario(new Vector3(0f, 0f, BrakeEntrySpeedMs));
            bool rearLifted = false;
            for (int i = 0; i < MaxBrakeTicks && !rearLifted; i++)
            {
                rig.Loop.State.FrontBrake = 1f;
                HoldRider(rig.Loop.State, Vector2.zero);
                rig.Loop.Step();
                rearLifted |= !rig.Loop.State.Wheels[Wheel.Rear].HasContact;
                if (Mathf.Abs(rig.Loop.State.ForwardSpeedMs) < StoppedSpeedMs) break;
            }
            Assert.IsTrue(rearLifted,
                "Hard front brake with the rider merely upright must lift the Twin's rear — "
                + "the owner's constraint (c): the stoppie is available, the stance (b) is "
                + "how you refuse it.");
        }

        [Test]
        public void S32d_LowGripCorner_LeaningIn_SlidesAway_CounterBalanceHolds()
        {
            // Banked right: hanging RIGHT (+x) is leaning IN with the bike, hanging
            // LEFT (−x) is the counter-balance.
            float leanIn = SlideAfterLowGripCorner(new Vector2(1f, 0f));
            float counter = SlideAfterLowGripCorner(new Vector2(-1f, 0f));

            Assert.Greater(leanIn, counter,
                $"On loose gravel the lean-in line must slide MORE ({leanIn:F2} m/s) than "
                + $"the counter-balanced line ({counter:F2} m/s) — the owner's constraint "
                + "(d): counter-balancing is what buys the traction.");
            Assert.Greater(leanIn - counter, 0.15f,
                $"The stance difference must be FELT, not statistical: Δ{leanIn - counter:F2} "
                + "m/s of retained slide separates the two lines.");
        }

        [Test]
        public void T3_Launch_ThrowsTheUnfoughtRiderHarderBack()
        {
            Rig rig = Settled();
            float maxBack = 0f;
            for (int i = 0; i < LiftWindowTicks; i++)
            {
                rig.Loop.State.Throttle = 1f;
                rig.Loop.Step();
                maxBack = Mathf.Max(maxBack, -rig.Loop.State.RiderPos.y);
            }
            Assert.Greater(maxBack, BaselineLaunchBack * LaunchGrowthFloor,
                "A full-throttle launch must throw the unfought rider back by at least "
                + "the T-3 factor over the donor-gain baseline (0.360) — the owner asked "
                + "for MORE balancing, and the launch is where he feels it first.");
            Assert.Less(maxBack, BaselineLaunchBack * LaunchGrowthCeiling,
                "…but not past the ceiling: a throw twice the asked-for bump is a "
                + "different game, not a tweak.");
        }
    }
}
