namespace QaAssistantApi.Models
{
    public class TestPlan
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SourcePath { get; set; } = string.Empty;
        public string Status { get; set; } = "Processing";
        public DateTime CreatedAt { get; set; }
        public ICollection<TestCase> TestCases { get; set; } = new List<TestCase>();
        public ICollection<Execution> Executions { get; set; } = new List<Execution>();
    }
}
