namespace QaAssistantApi.Models
{
    public class GeneratedProject
    {
        public int Id { get; set; }
        public int TestPlanId { get; set; }
        public TestPlan? TestPlan { get; set; }
        public string PackageName { get; set; } = string.Empty;
        public string PackagePath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = "Pending";
    }
}
