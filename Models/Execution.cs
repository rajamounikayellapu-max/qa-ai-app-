namespace QaAssistantApi.Models
{
    public class Execution
    {
        public int Id { get; set; }
        public int TestPlanId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; } = "Running"; // Running, Completed, Failed
        public int TotalTests { get; set; }
        public int PassedTests { get; set; }
        public int FailedTests { get; set; }
        public string? Logs { get; set; }
        public string? ErrorMessage { get; set; }

        public TestPlan TestPlan { get; set; } = null!;
    }
}