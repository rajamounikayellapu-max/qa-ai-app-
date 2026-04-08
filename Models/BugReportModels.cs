namespace QaAssistantApi.Models;

public class BugReportRequest
{
    public string Note { get; set; } = string.Empty;
    public string Severity { get; set; } = "Medium";
}

public class BugReportResponse
{
    public string Title { get; set; } = string.Empty;
    public string StepsToReproduce { get; set; } = string.Empty;
    public string ExpectedResult { get; set; } = string.Empty;
    public string ActualResult { get; set; } = string.Empty;
    public string SeveritySuggestion { get; set; } = string.Empty;
    public string SelectedSeverity { get; set; } = string.Empty;
}
