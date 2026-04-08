namespace QaAssistantApi.Models;

public class SeleniumScriptRequest
{
    public string Steps { get; set; } = string.Empty;
}

public class SeleniumScriptResponse
{
    public string Script { get; set; } = string.Empty;
}
