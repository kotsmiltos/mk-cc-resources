// REAL sample, trimmed: one of the owner's game projects, TwinRearBrakeStoppieTests.cs AFTER the
// data commit of 2026-09-30 01:34 (+0300) that went in with round 1. The assertions of the test are
// verbatim; the row set-up and helpers were cut. Paths and ids removed.

using System.Collections.Generic;
using System.Globalization;
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
                // S3-2(c)'s row: an UPRIGHT rider, both levers. ride-look-2 E4 re-pinned what it
                // must show (below): on flat ground it no longer lifts the rear.
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

            // ride-look-2 E4 RE-PIN (PHYSICS-DESIGN.md §3 E4, Pins; §4.2): upright, both levers, flat
            // ground — no rear lift. The old "the upright stoppie lever survives" (pitch ≤ −15° or 0.2 s
            // of rear air) was made by the authored 2.4× front-lever dive, retired with the rider's mass.
            Row upright = rows.Find(r => r.Mode == "upright-both");
            Assert.IsFalse(upright.Crashed, "The upright both-brakes stop crashed.");
            Assert.Less(upright.RearAirSec, 0.10f,
                "Upright, both brakes, flat ground: the rear lifted — a lift needs 1.087 g here and the front "
                + "gives 0.64 g; something authored is pressing the nose down.");
            Assert.Greater(upright.PitchMinDeg, -20f,
                "Upright, both brakes, flat ground: the bike pitched past −20° — a stoppie in all but contact flags.");
            foreach (string mode in new[] { "rode-fullback-both", "rode-upright-both" })
            {
                Row r = rows.Find(x => x.Mode == mode);
                TestContext.WriteLine(string.Format(CultureInfo.InvariantCulture,
                    "{0} (the 220 kg bike he rode, recorded): rear air {1:F2} s, pitch min {2:F1}°, crashed {3}",
                    mode, r.RearAirSec, r.PitchMinDeg, r.Crashed));
            }
        }
    }
}
