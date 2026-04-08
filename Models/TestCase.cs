using System.ComponentModel.DataAnnotations.Schema;

namespace QaAssistantApi.Models
{
    public class TestCase
    {
        public int Id { get; set; }
        public int? TestPlanId { get; set; }
        public TestPlan? TestPlan { get; set; }
        public string? ExternalId { get; set; }
        public string? Title { get; set; }
        public string? Steps { get; set; }
        public string? ExpectedResult { get; set; }
        public string? Status { get; set; }

        [NotMapped]
        public List<string>? StepList { get; set; }
    }
}