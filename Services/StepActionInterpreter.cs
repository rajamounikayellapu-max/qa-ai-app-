using System.Text.RegularExpressions;

namespace QaAssistantApi.Services;

public interface IStepInterpreter
{
    Task<IReadOnlyList<StepAction>> InterpretAsync(string steps);
}

public record StepAction(string ActionType, string Target, string Value, bool NeedsReview = false);

public class RuleBasedStepInterpreter : IStepInterpreter
{
    public Task<IReadOnlyList<StepAction>> InterpretAsync(string steps)
    {
        var stepLines = steps
            .Split(new[] { ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .ToList();

        var actions = stepLines.Select(line => new StepAction(
            ActionType: DetectActionType(line),
            Target: ExtractTarget(line),
            Value: ExtractValue(line),
            NeedsReview: line.Contains("?", StringComparison.OrdinalIgnoreCase) || line.Contains("optional", StringComparison.OrdinalIgnoreCase)
        )).ToArray();

        return Task.FromResult<IReadOnlyList<StepAction>>(actions);
    }

    private static string DetectActionType(string line)
    {
        var text = line.ToLowerInvariant();
        if (text.Contains("login") || text.Contains("sign in") || text.Contains("authenticate")) return "login";
        if (text.Contains("open") || text.Contains("navigate") || text.Contains("go to") || text.Contains("visit")) return "navigate";
        if (text.Contains("enter") || text.Contains("type") || text.Contains("fill") || text.Contains("set")) return "input";
        if (text.Contains("click") || text.Contains("tap") || text.Contains("press") || text.Contains("select")) return "click";
        if (text.Contains("verify") || text.Contains("assert") || text.Contains("confirm") || text.Contains("check") || text.Contains("expect")) return "verify";
        if (text.Contains("wait") || text.Contains("pause") || text.Contains("sleep")) return "wait";
        return "action";
    }

    private static string ExtractTarget(string line)
    {
        var knownTargets = new[] { "username", "password", "email", "login", "search", "cart", "checkout", "submit", "confirm" };
        foreach (var target in knownTargets)
        {
            if (line.Contains(target, StringComparison.OrdinalIgnoreCase))
            {
                return target;
            }
        }

        var quoted = Regex.Match(line, "[\\\"']([^\\\"']+)[\\\"']");
        if (quoted.Success)
        {
            return quoted.Groups[1].Value;
        }

        return string.Empty;
    }

    private static string ExtractValue(string line)
    {
        var match = Regex.Match(line, @"enter\s+(.+?)(?:\s+into|\s+in|\s+field|$)", RegexOptions.IgnoreCase);
        if (match.Success)
        {
            return match.Groups[1].Value.Trim();
        }

        if (line.Contains("as ", StringComparison.OrdinalIgnoreCase))
        {
            var parts = Regex.Split(line, "as ", RegexOptions.IgnoreCase);
            if (parts.Length > 1)
            {
                return parts[1].Trim();
            }
        }

        return string.Empty;
    }
}
