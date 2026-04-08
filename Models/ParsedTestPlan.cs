namespace QaAssistantApi.Models
{
    public class ParsedTestPlan
    {
        public string Title { get; set; } = string.Empty;
        public List<ParsedTestCase> TestCases { get; set; } = new List<ParsedTestCase>();
    }

    public class ParsedTestCase
    {
        public string ExternalId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Steps { get; set; } = string.Empty;
        public List<string> StepList { get; set; } = new List<string>();
        public string ExpectedResult { get; set; } = string.Empty;
    }
}
