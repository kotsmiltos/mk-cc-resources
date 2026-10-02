// REAL sample, trimmed: one of the owner's game projects, TwinRearBrakeStoppieTests.cs BEFORE the
// data commit of 2026-09-30 01:34 (+0300) that went in with round 1. The assertions of the test are
// verbatim; the row set-up and helpers were cut. Paths and ids removed.

using System.Collections.Generic;
using NUnit.Framework;

namespace TwinGame.EditTests
{
    public class TwinRearBrakeStoppieTests
    {
        [Test]
        public void RearBrake_FullBackStance_Recorded_LockAndNoStoppie()
        {
            var rows = new List<Row>
            {
                Run(new Config { Mode = "fullback-both", Squat = "input-hold" }),
                Run(new Config { Mode = "fullback-rearonly", FrontBrake = false }),
                // S3-2(c) must survive the fix: an UPRIGHT rider still meets the lever.
                Run(new Config { Mode = "upright-both", Squat = "upright" }),
            };

            // His check, verbatim: the rear brake blocks the wheel — locks and skids.
            Row rear = rows.Find(r => r.Mode == "fullback-rearonly");
            Assert.IsFalse(rear.Crashed, "The rear-only stop crashed.");
            Assert.GreaterOrEqual(rear.RearLockedSec, 1.0f,
                "The rear never locked under a full pedal at full-back stance — "
                + "'the rear brake doesn't block the wheel' is still true.");
            Assert.Less(rear.RearAirSec, 0.10f,
                "The rear-only stop lifted the rear — rear pedal must never stoppie "
                + "a hung-back rider.");

            // The ratified S3-2(c) lever survives: upright, the front brake still tips.
            Row upright = rows.Find(r => r.Mode == "upright-both");
            Assert.IsTrue(upright.PitchMinDeg <= -15f || upright.RearAirSec >= 0.2f,
                "The upright-rider stoppie lever is GONE — the anchor fix must not "
                + "flatten S3-2(c); only the hung-back rider refuses the lift.");
        }
    }
}
