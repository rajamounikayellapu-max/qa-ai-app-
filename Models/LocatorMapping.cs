namespace QaAssistantApi.Models
{
    public class LocatorMapping
    {
        public int Id { get; set; }
        public int TestCaseId { get; set; }
        public TestCase? TestCase { get; set; }
        public int StepIndex { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Selector { get; set; } = string.Empty;
        public string SelectorType { get; set; } = "XPath";
        public bool IsDefault { get; set; }
    }
}
