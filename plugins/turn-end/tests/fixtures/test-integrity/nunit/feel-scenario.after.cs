// REAL sample, trimmed: one of the owner's game projects, TwinFeelScenarioTests.cs AFTER the
// round-1 commit of 2026-09-30 01:35 (+0300). Assertion lines, messages, attributes and test names
// are verbatim; long comments and unrelated tests were cut. Paths and ids removed.

using NUnit.Framework;
using UnityEngine;

namespace TwinGame.EditTests
{
    public class TwinFeelScenarioTests
    {
        // ===============================================================================
        // (a) full throttle + rider full-back. RE-PINNED by ride-look-2 E4: on FLAT ground the
        //     throttle no longer starts a wheelie at any stance.
        // ===============================================================================

        private static readonly float[] FlatWheelieStances = { -1f, -1.3f, 0f };

        [Test]
        public void S32a_FullThrottle_OnFlatGround_NoStanceStartsAWheelie()
        {
            foreach (float y in FlatWheelieStances)
            {
                Rig rig = Settled();
                bool lifted = false;
                float minFrontLoadN = float.MaxValue;
                for (int i = 0; i < LiftWindowTicks && !lifted; i++)
                {
                    rig.Loop.State.Throttle = 1f;
                    HoldRider(rig.Loop.State, new Vector2(0f, y));
                    rig.Loop.Step();
                    lifted |= !rig.Loop.State.Wheels[Wheel.Front].HasContact;
                    minFrontLoadN = Mathf.Min(minFrontLoadN, rig.Loop.State.Wheels[Wheel.Front].LoadN);
                }
                TestContext.WriteLine(
                    $"full throttle on the flat, rider y {y:+0.0;-0.0;0}: front lifted {lifted}, lowest front load "
                    + $"{minFrontLoadN:F0} N, speed after {LiftWindowSec} s {rig.Loop.State.ForwardSpeedMs:F1} m/s");
                Assert.IsFalse(lifted,
                    $"Full throttle on flat ground lifted the front at rider y {y} — the engine's 0.46 g cannot start "
                    + "a wheelie that needs ≥ 0.92 g (PHYSICS-DESIGN.md §4.2); something authored is lifting it.");
            }
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
        // (c) front brake alone + rider upright. RE-PINNED by ride-look-2 E4: on flat, level
        //     ground a seated rider's front brake no longer lifts the rear.
        // ===============================================================================

        private const float FlatFrontStopSteadyFromSec = 0.5f;

        [Test]
        public void S32c_FrontBrakeOnly_RiderUpright_OnFlatGround_TheRearStaysDown()
        {
            Rig rig = Settled();
            float parkedRearN = rig.Loop.State.Wheels[Wheel.Rear].LoadN;
            JumpToVelocity(rig, new Vector3(0f, 0f, BrakeEntrySpeedMs));
            RollWheelsWithBody(rig);
            bool rearLifted = false;
            float steadyRearSum = 0f;
            int steadyFrom = Ticks(FlatFrontStopSteadyFromSec), steadyN = 0;
            for (int i = 0; i < MaxBrakeTicks && !rearLifted; i++)
            {
                rig.Loop.State.FrontBrake = 1f;
                HoldRider(rig.Loop.State, Vector2.zero);
                rig.Loop.Step();
                rearLifted |= !rig.Loop.State.Wheels[Wheel.Rear].HasContact;
                if (Mathf.Abs(rig.Loop.State.ForwardSpeedMs) < StoppedSpeedMs) break;
                if (i < steadyFrom) continue;
                steadyRearSum += rig.Loop.State.Wheels[Wheel.Rear].LoadN;
                steadyN++;
            }
            Assert.Greater(steadyN, 0, "Test setup: the stop had no steady window to read.");
            float steadyRearN = steadyRearSum / steadyN;
            float transferFloorN = parkedRearN * 0.4f;
            Assert.IsFalse(rearLifted,
                "A seated front-brake stop on flat, level ground lifted the rear — a start needs 1.087 g; the "
                + "front gives 0.64 g. Something authored is pressing the nose down.");
            Assert.IsFalse(rig.Loop.State.Crashed, "The flat front-brake stop crashed.");
            Assert.GreaterOrEqual(steadyRearN, transferFloorN,
                "Once the stop is steady the rear is lighter than the stop's own load transfer can make it — "
                + "something besides the deceleration at the centre of mass is unloading it.");
        }

        private const string S32dSinceE4 =
            "S32d since ride-look-2 E4 (decisions-draft/E4.md): this pin was a GRIP-ONLY claim.";

        [Test]
        [Ignore("PROPOSAL ruling, round 1 of the 29 Sep kickoff (DECISIONS): waits for round 2. A grip-only pin "
                + "(roll stack off) whose premise the rider's mass cannot honour — his weight rolls the bike and no "
                + "roll stack removes it (traced, decisions-draft/E4.md); on the bike he rides today, roll weight "
                + "on, the same scenario was already reversed (0.92 vs 2.37). Round 2 is his ruling's own check "
                + "('rider out ... tighter; rider in lets go first') and re-measures it.")]
        public void S32d_LowGripCorner_LeaningIn_SlidesAway_CounterBalanceHolds()
        {
            // Banked right: hanging RIGHT (+x) is leaning IN with the bike, hanging
            // LEFT (−x) is the counter-balance.
            float leanIn = SlideAfterLowGripCorner(new Vector2(1f, 0f));
            float counter = SlideAfterLowGripCorner(new Vector2(-1f, 0f));
            TestContext.WriteLine($"lean-in {leanIn:F2} m/s, counter {counter:F2} m/s retained. {S32dSinceE4}");

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
            float maxBack = LaunchThrowBack(null);
            float baseline = LaunchThrowBack(DonorThrowGains);
            TestContext.WriteLine($"T3 launch: unfought throw back {maxBack:F3} over the donor gains' {baseline:F3} on the "
                                  + $"same body = {maxBack / baseline:F2}× (the 2026-08-12 preset constant {BaselineLaunchBack:F3})");
            Assert.Greater(maxBack, baseline * LaunchGrowthFloor,
                "A full-throttle launch must throw the unfought rider back by at least "
                + "the T-3 factor over the donor-gain baseline — the owner asked "
                + "for MORE balancing, and the launch is where he feels it first.");
            Assert.Less(maxBack, baseline * LaunchGrowthCeiling,
                "…but not past the ceiling: a throw twice the asked-for bump is a "
                + "different game, not a tweak.");
        }
    }
}
