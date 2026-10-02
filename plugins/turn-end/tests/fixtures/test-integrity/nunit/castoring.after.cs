// REAL sample, trimmed: one of the owner's game projects, TwinCastoringFrontTests.cs AFTER the
// round-1 commit of 2026-09-30 01:35 (+0300). The test body, its [Ignore] and its assertions are
// verbatim; the rest of the file was cut. Paths and ids removed.

using System.Collections.Generic;
using System.Globalization;
using NUnit.Framework;
using UnityEngine;

namespace TwinGame.EditTests
{
    public class TwinCastoringFrontTests
    {
        /// <summary>
        /// (decisions-draft/E3+E11.md, R-E11-2). Asserted: with the key ramped in, the castoring front
        /// holds wherever the open-loop front holds, and where the open-loop front carves a clean turn it
        /// settles at the same lean within 1°. The pressed key is recorded beside it, not asserted.
        ///
        /// <para><b>ride-look-2 E4: RED on two cells (one since round 1's first gear), [Ignore]d under the PROPOSAL ruling A-110 until round 2 re-rules "held" and removes it</b> (the E4 verifier's defect 5).
        /// Every failing cell is listed before the assert.</para>
        /// </summary>
        [Test]
        [Ignore("PROPOSAL ruling, round 1 of the 29 Sep kickoff (DECISIONS): waits for round 2. Since the rider's "
                + "mass (E4) one cell of the rider hung a full unit INSIDE at the grip limit falls where the rigid "
                + "reference 'holds' — at 48° sliding wide, carving only 0.54 of its arc, not a carved turn. Round 2 "
                + "rebuilds exactly this (his 29 Sep ruling: rider out pushes the bike down and turns tighter; rider "
                + "in lets go first) and re-rules 'held' for this test and bench.py lean-ramp together.")]
        public void WithTheRiderOffCentre_ARampedFullKeyHoldsWhereverTheOpenLoopFrontDoes_APressedOneIsRecorded()
        {
            var failures = new List<string>();
            foreach (float mu in OffCentreMu)
            {
                TireParams tire = TwinBikePresets.TireWithGrip(mu, mu * GripLimitSlideOverPeak);
                foreach (float speed in GripLimitSpeedsMs)
                    foreach (float x in OffCentreRiderXs)
                    {
                        var ramped = new SteadyTurnSpec(speed, 1f, GripLimitHoldSec, SteadyTurnSpec.DefaultReadSec,
                                                        LeanKeyArrival.RampedFromStraight(GripLimitRampSec), x);
                        SteadyTurnResult castorRamped = RideTurn(ramped, null, tire);
                        SteadyTurnResult rigidRamped = RideTurn(ramped, CamberSteerParams.Enduro300(), tire);
                        // Printed as each cell is ridden, so the record survives a failing assert below.
                        TestContext.WriteLine(string.Format(CultureInfo.InvariantCulture,
                            "µ {0:F2} {1,2:F0} m/s x {2:+0.000;-0.000} | ramped: castor {3} | rigid {4}",
                            mu, speed, x, castorRamped.Describe(), rigidRamped.Describe()));
                        if (rigidRamped.Crashed) continue;
                        if (castorRamped.Crashed)
                        {
                            failures.Add($"µ {mu} at {speed} m/s, rider x {x}: the open-loop front holds a ramped full key, "
                                         + $"so the castoring front must too ({castorRamped.Describe()}; rigid "
                                         + $"{rigidRamped.Describe()})");
                            continue;
                        }
                        if (rigidRamped.ArcShare < CleanTurnArcShareMin) continue;
                        if (Mathf.Abs(rigidRamped.MeanLeanDeg - castorRamped.MeanLeanDeg) > SameTurnLeanToleranceDeg)
                            failures.Add($"µ {mu} at {speed} m/s, rider x {x}: the same settled turn as the open-loop "
                                         + $"front's clean one (castor {castorRamped.MeanLeanDeg:F1}°, rigid "
                                         + $"{rigidRamped.MeanLeanDeg:F1}° ± {SameTurnLeanToleranceDeg}°)");
                    }
            }
            foreach (string failure in failures) TestContext.WriteLine("FAILS: " + failure);
            Assert.IsEmpty(failures, $"{failures.Count} off-centre cell(s) fail (listed above): "
                                     + string.Join(" | ", failures));
        }
    }
}
