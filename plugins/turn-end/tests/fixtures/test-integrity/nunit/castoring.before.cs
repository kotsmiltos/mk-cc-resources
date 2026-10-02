// REAL sample, trimmed: one of the owner's game projects, TwinCastoringFrontTests.cs BEFORE the
// round-1 commit of 2026-09-30 01:35 (+0300). The test body and its assertions are verbatim; the
// rest of the file was cut. Paths and ids removed.

using System.Globalization;
using NUnit.Framework;

namespace TwinGame.EditTests
{
    public class TwinCastoringFrontTests
    {
        /// <summary>
        /// (decisions-draft/E3+E11.md, R-E11-2). Asserted: with the key ramped in, the castoring front
        /// holds wherever the open-loop front holds, and where the open-loop front carves a clean turn it
        /// settles at the same lean within 1°. The pressed key is recorded beside it, not asserted.
        /// </summary>
        [Test]
        public void WithTheRiderOffCentre_ARampedFullKeyHoldsWhereverTheOpenLoopFrontDoes_APressedOneIsRecorded()
        {
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
                        Assert.IsFalse(castorRamped.Crashed,
                            $"µ {mu} at {speed} m/s, rider x {x}: the open-loop front holds a ramped full key, so the castoring "
                            + $"front must too ({castorRamped.Describe()}; rigid {rigidRamped.Describe()})");
                        if (rigidRamped.ArcShare < CleanTurnArcShareMin) continue;
                        Assert.AreEqual(rigidRamped.MeanLeanDeg, castorRamped.MeanLeanDeg, SameTurnLeanToleranceDeg,
                            $"µ {mu} at {speed} m/s, rider x {x}: the same settled turn as the open-loop front's clean one");
                    }
            }
        }
    }
}
