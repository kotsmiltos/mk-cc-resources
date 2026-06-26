namespace Colony
{
    // EDIT SITE 1 (declaration): adding a JobClass instance edits this enum.
    public enum JobClass { Worker, Soldier, Scout }

    public static class JobCost
    {
        // EDIT SITE 2 (switch): exhaustive switch over JobClass.
        public static int Food(JobClass c)
        {
            switch (c)
            {
                case JobClass.Worker: return 1;
                case JobClass.Soldier: return 3;
                case JobClass.Scout: return 2;
                default: return 0;
            }
        }
    }
}
