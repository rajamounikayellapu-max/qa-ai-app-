namespace QaAssistantApi.Models
{
    public class TestGenerationResponse
    {
        public string Requirement { get; set; } = string.Empty;
        public List<string> FunctionalTestCases { get; set; } = new();
        public List<string> NegativeTestCases { get; set; } = new();
        public List<string> BoundaryTestCases { get; set; } = new();
        public List<string> EdgeCases { get; set; } = new();
    }
}
