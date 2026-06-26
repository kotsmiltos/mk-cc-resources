using System.Collections.Generic;

namespace Colony
{
    public static class JobSim
    {
        // EDIT SITE 3 (switch, duplicated): same shape as JobCost.Food --
        // adding a JobClass instance edits this twin too.
        public static int Speed(JobClass c)
        {
            switch (c)
            {
                case JobClass.Worker: return 5;
                case JobClass.Soldier: return 3;
                case JobClass.Scout: return 8;
                default: return 0;
            }
        }

        // EDIT SITE 4 (dict dispatch): keyed on JobClass instances.
        static readonly Dictionary<JobClass, string> Icons =
            new Dictionary<JobClass, string>
            {
                { JobClass.Worker, "w" },
                { JobClass.Soldier, "s" },
                { JobClass.Scout, "c" },
            };
    }
}
