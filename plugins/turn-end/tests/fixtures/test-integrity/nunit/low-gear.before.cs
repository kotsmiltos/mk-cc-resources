// REAL sample, trimmed: one of the owner's game projects, LowGearClimbTests.cs BEFORE the commit
// of 2026-09-26 14:33 (+0300) ("the low-gear key rows judged to one float step"). The test body and
// its assertions are verbatim; the rest of the file was cut. Paths and ids removed.

using System;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;

namespace TwinGame.EditTests
{
    public class LowGearClimbTests
    {
        private const int RampedLeverMaxUlps = 2;

        private static int UlpDistance(float a, float b)
        {
            if (a == b) return 0;
            int bitsA = BitConverter.SingleToInt32Bits(a);
            int bitsB = BitConverter.SingleToInt32Bits(b);
            // Opposite signs are never "one rounding apart" (the torques here are ≥ 0).
            if ((bitsA < 0) != (bitsB < 0)) return int.MaxValue;
            return Math.Abs(bitsA - bitsB);
        }

        [Test]
        public void TheShippedDrivetrain_RunsTheLowRangeCurve()
        {
            Assert.IsInstanceOf<TwinLowRangeCurve>(TwinBikePresets.Drivetrain().TorqueCurve,
                "The Twin's drivetrain must carry the low-range curve (CHECK 13).");
            Assert.IsNull(DrivetrainParams.Enduro300().TorqueCurve,
                "The donor's drivetrain must keep the donor line (no curve) — default-preserving.");
        }

        [Test]
        public void OnTheFlatAndDownhill_TheCurveIsTodaysEngine_ToTheBitForKeys_WithinTwoRoundingsForRampedLevers()
        {
            TwinLowRangeCurve curve = TwinBikePresets.LowRangeCurve();
            float[] keys = { 0f, 1f };
            var rampedLevers = new List<float>(RampLevers(PhysicsRate.FixedDtSec));
            rampedLevers.AddRange(RampLevers(AuthoredDtSec));

            for (float spin = -GridSpinSpanRadPerSec; spin <= GridSpinSpanRadPerSec; spin += GridSpinStepRadPerSec)
            {
                // The donor drivetrain's own expression, verbatim (DrivetrainSystem, null curve).
                float headroom = Mathf.Clamp01(1f - Mathf.Abs(spin) / TwinBikePresets.MaxWheelSpeedRadPerSec);
                foreach (float slope in FlatAndDownhillSlopesDeg)
                {
                    float curveNm = curve.MaxDriveNm(new DriveQuery(spin, slope));
                    foreach (float throttle in keys)
                    {
                        float today = throttle * TwinBikePresets.MaxWheelTorqueNm * headroom;
                        float withCurve = throttle * curveNm;
                        Assert.AreEqual(today, withCurve, 0f,
                            $"At spin {spin} rad/s on {slope}° with the key {(throttle > 0f ? "held" : "off")} "
                            + "the curve is not today's engine to the bit.");
                    }
                    foreach (float lever in rampedLevers)
                    {
                        float today = lever * TwinBikePresets.MaxWheelTorqueNm * headroom;
                        float withCurve = lever * curveNm;
                        Assert.LessOrEqual(UlpDistance(today, withCurve), RampedLeverMaxUlps,
                            $"At spin {spin} rad/s on {slope}° with a ramped lever of {lever:R} the curve "
                            + $"gives {withCurve:R} Nm against today's {today:R} — more than "
                            + $"{RampedLeverMaxUlps} float steps apart, so it is not today's engine.");
                    }
                }
            }
        }
    }
}
