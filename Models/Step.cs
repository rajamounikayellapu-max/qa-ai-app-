namespace QaAssistantApi.Models
{
    public class Step
    {
        public int Id { get; set; }
        public int TestCaseId { get; set; }
        public int StepIndex { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ExpectedResult { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public TestCase TestCase { get; set; } = null!;
    }
}