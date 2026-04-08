namespace QaAssistantApi.Models;

public class MetricsResponse
{
    public List<DailyMetric> DailyTrend { get; set; } = new();
    public List<SprintMetric> SprintMetrics { get; set; } = new();
}

public class DailyMetric
{
    public string Date { get; set; } = string.Empty;
    public int Passed { get; set; }
    public int Failed { get; set; }
    public int Defects { get; set; }
}

public class SprintMetric
{
    public string Sprint { get; set; } = string.Empty;
    public int PassRate { get; set; }
    public int Defects { get; set; }
}
