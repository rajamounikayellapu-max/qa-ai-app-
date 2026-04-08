using System.Text;
using System.Text.RegularExpressions;
using QaAssistantApi.Models;

namespace QaAssistantApi.Services;

public static class SeleniumScriptGenerator
{
    private static readonly string[] InputActionVerbs = { "enter", "type", "input", "fill", "set", "provide" };
    private static readonly string[] ClickActionVerbs = { "click", "press", "tap", "submit" };
    private static readonly string[] OpenActionVerbs = { "open", "navigate to", "go to", "visit", "log into", "login" };
    private static readonly string[] SelectActionVerbs = { "select", "choose", "pick" };
    private static readonly string[] WaitActionVerbs = { "wait", "sleep", "pause", "hold", "delay" };
    private static readonly string[] AssertActionVerbs = { "verify", "assert", "ensure", "confirm", "check" };
    private static readonly string[] KnownFieldKeys =
    {
        "username", "password", "email", "search", "code", "login", "submit", "register",
        "first name", "last name", "phone", "address", "city", "zip", "country", "state"
    };

    public static SeleniumScriptResponse Generate(string steps)
    {
        steps = steps?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(steps))
        {
            return new SeleniumScriptResponse
            {
                Script = "// Please provide steps for the Selenium script generator."
            };
        }

        var lines = ParseSteps(steps);
        var script = BuildScript(lines);

        return new SeleniumScriptResponse
        {
            Script = script
        };
    }

    private static IEnumerable<ParsedStep> ParseSteps(string steps)
    {
        var stepLines = steps.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        var parsedSteps = new List<ParsedStep>();

        foreach (var rawLine in stepLines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line)) continue;
            parsedSteps.Add(ParseStep(line));
        }

        return parsedSteps;
    }

    private static ParsedStep ParseStep(string step)
    {
        var normalized = step.ToLowerInvariant();

        if (normalized.Contains("http") || ContainsAny(normalized, OpenActionVerbs))
        {
            var url = ExtractUrl(step);
            var actionType = normalized.Contains("log into") || normalized.Contains("login") ? ActionType.Navigate : ActionType.OpenUrl;
            return new ParsedStep(actionType, step, url, string.Empty);
        }

        if (ContainsAny(normalized, InputActionVerbs) && !ContainsAny(normalized, SelectActionVerbs))
        {
            var (target, value) = ExtractTargetAndValue(step, KnownFieldKeys);
            return new ParsedStep(ActionType.EnterText, step, value, target);
        }

        if (ContainsAny(normalized, ClickActionVerbs))
        {
            var target = ExtractTarget(step, KnownFieldKeys);
            return new ParsedStep(ActionType.Click, step, string.Empty, target);
        }

        if (ContainsAny(normalized, WaitActionVerbs))
        {
            var timeout = ExtractTimeout(step);
            return new ParsedStep(ActionType.Wait, step, timeout.ToString());
        }

        if (ContainsAny(normalized, SelectActionVerbs))
        {
            var (target, value) = ExtractTargetAndValue(step, KnownFieldKeys);
            return new ParsedStep(ActionType.Select, step, value, target);
        }

        if (ContainsAny(normalized, AssertActionVerbs))
        {
            return new ParsedStep(ActionType.Assert, step, string.Empty);
        }

        return new ParsedStep(ActionType.Unknown, step, string.Empty);
    }

    private static string BuildScript(IEnumerable<ParsedStep> steps)
    {
        var script = new StringBuilder();
        script.AppendLine("using NUnit.Framework;");
        script.AppendLine("using OpenQA.Selenium;");
        script.AppendLine("using OpenQA.Selenium.Chrome;");
        script.AppendLine("using OpenQA.Selenium.Support.UI;");
        script.AppendLine("using SeleniumExtras.WaitHelpers;");
        script.AppendLine();
        script.AppendLine("namespace QaAssistantAutomation;");
        script.AppendLine();
        script.AppendLine("public class GeneratedSeleniumTests");
        script.AppendLine("{");
        script.AppendLine("    private IWebDriver driver = null!;");
        script.AppendLine("    private WebDriverWait wait = null!;");
        script.AppendLine();
        script.AppendLine("    [SetUp]");
        script.AppendLine("    public void SetUp()");
        script.AppendLine("    {");
        script.AppendLine("        var options = new ChromeOptions();");
        script.AppendLine("        options.AddArgument(\"--start-maximized\");");
        script.AppendLine("        driver = new ChromeDriver(options);");
        script.AppendLine("        driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(5);");
        script.AppendLine("        wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));");
        script.AppendLine("    }");
        script.AppendLine();
        script.AppendLine("    [TearDown]");
        script.AppendLine("    public void TearDown()");
        script.AppendLine("    {");
        script.AppendLine("        driver.Quit();");
        script.AppendLine("    }");
        script.AppendLine();
        script.AppendLine("    [Test]");
        script.AppendLine("    public void GeneratedTest()");
        script.AppendLine("    {");
        script.AppendLine("        try");
        script.AppendLine("        {");

        var stepIndex = 1;
        foreach (var step in steps)
        {
            script.AppendLine($"            // Step {stepIndex}: {step.RawText}");
            var actionCode = GenerateScriptLine(step);
            foreach (var actionLine in actionCode.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                script.AppendLine($"            {actionLine}");
            }
            script.AppendLine();
            stepIndex++;
        }

        script.AppendLine("        }");
        script.AppendLine("        catch (Exception ex)");
        script.AppendLine("        {");
        script.AppendLine("            Assert.Fail($\"Test failed at runtime: {ex.Message}\");");
        script.AppendLine("        }");
        script.AppendLine("    }");
        script.AppendLine("}");

        return script.ToString();
    }

    private static string GenerateScriptLine(ParsedStep step)
    {
        return step.ActionType switch
        {
            ActionType.OpenUrl => BuildOpenUrl(step),
            ActionType.Navigate => BuildOpenUrl(step), // Same as OpenUrl
            ActionType.EnterText => BuildEnterText(step),
            ActionType.Click => BuildClick(step),
            ActionType.Wait => BuildWait(step),
            ActionType.Select => BuildSelect(step),
            ActionType.Assert => BuildAssert(step),
            _ => $"// TODO: translate step: {EscapeString(step.RawText)}",
        };
    }

    private static string BuildOpenUrl(ParsedStep step)
    {
        var url = string.IsNullOrWhiteSpace(step.Value) ? "https://example.com" : step.Value;
        var comment = string.IsNullOrWhiteSpace(step.Value) ? " // TODO: Replace with actual page URL" : string.Empty;
        return $"driver.Navigate().GoToUrl(\"{EscapeString(url)}\");{comment}";
    }

    private static string BuildEnterText(ParsedStep step)
    {
        var locator = ResolveLocator(step.Target, step.RawText, out var needsReview);
        var text = string.IsNullOrWhiteSpace(step.Value) ? "<text>" : EscapeString(step.Value);
        var builder = new StringBuilder();
        builder.AppendLine($"var element = wait.Until(ExpectedConditions.ElementIsVisible({locator}));");
        builder.AppendLine("element.Clear();");
        builder.Append($"element.SendKeys(\"{text}\");");
        if (needsReview)
        {
            builder.Append(" // TODO: Verify locator and input value");
        }

        return builder.ToString();
    }

    private static string BuildClick(ParsedStep step)
    {
        var locator = ResolveLocator(step.Target, step.RawText, out var needsReview);
        var line = $"wait.Until(ExpectedConditions.ElementToBeClickable({locator})).Click();";
        if (needsReview)
        {
            line += " // TODO: Verify locator";
        }

        return line;
    }

    private static string BuildWait(ParsedStep step)
    {
        if (int.TryParse(step.Value, out var seconds) && seconds > 0)
        {
            return $"System.Threading.Thread.Sleep(TimeSpan.FromSeconds({seconds}));";
        }

        return "System.Threading.Thread.Sleep(TimeSpan.FromSeconds(1)); // adjust wait as needed";
    }

    private static string BuildSelect(ParsedStep step)
    {
        var locator = ResolveLocator(step.Target, step.RawText, out var needsReview);
        var option = string.IsNullOrWhiteSpace(step.Value) ? "<option text>" : EscapeString(step.Value);
        var line = $"new OpenQA.Selenium.Support.UI.SelectElement(wait.Until(ExpectedConditions.ElementIsVisible({locator}))).SelectByText(\"{option}\");";
        if (needsReview)
        {
            line += " // TODO: Verify locator and selected option";
        }

        return line;
    }

    private static string BuildAssert(ParsedStep step)
    {
        return "// TODO: add assertion for this verification step.";
    }

    private static string ResolveLocator(string target, string rawText, out bool needsReview)
    {
        needsReview = false;
        var normalized = rawText.ToLowerInvariant();

        if (!string.IsNullOrWhiteSpace(target))
        {
            if (target.Contains("username", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"username\")";
            if (target.Contains("password", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"password\")";
            if (target.Contains("email", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"email\")";
            if (target.Contains("login", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"login\")";
            if (target.Contains("submit", StringComparison.OrdinalIgnoreCase))
            {
                needsReview = true;
                return "By.Id(\"submit\")";
            }
            if (target.Contains("register", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"register\")";
            if (target.Contains("search", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"search\")";
            if (target.Contains("dropdown", StringComparison.OrdinalIgnoreCase)) return "By.CssSelector(\"select\")";
            if (target.Contains("button", StringComparison.OrdinalIgnoreCase))
            {
                needsReview = true;
                return "By.CssSelector(\"button\")";
            }
        }

        if (normalized.Contains("username", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"username\")";
        if (normalized.Contains("password", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"password\")";
        if (normalized.Contains("email", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"email\")";
        if (normalized.Contains("login", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"login\")";
        if (normalized.Contains("submit", StringComparison.OrdinalIgnoreCase))
        {
            needsReview = true;
            return "By.Id(\"submit\")";
        }
        if (normalized.Contains("search", StringComparison.OrdinalIgnoreCase)) return "By.Id(\"search\")";
        if (normalized.Contains("button", StringComparison.OrdinalIgnoreCase))
        {
            needsReview = true;
            return "By.CssSelector(\"button\")";
        }

        needsReview = true;
        return "By.CssSelector(\"REPLACE_WITH_SELECTOR\")";
    }

    private static bool ContainsAny(string text, IEnumerable<string> patterns)
    {
        foreach (var pattern in patterns)
        {
            if (text.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static (string Target, string Value) ExtractTargetAndValue(string step, string[] keys)
    {
        var target = ExtractTarget(step, keys);
        var value = string.Empty;

        if (!string.IsNullOrWhiteSpace(target))
        {
            var tokens = Tokenize(step);
            var keyIndex = Array.FindIndex(tokens, token => token.Equals(target, StringComparison.OrdinalIgnoreCase));
            if (keyIndex >= 0 && keyIndex + 1 < tokens.Length)
            {
                var remaining = tokens.Skip(keyIndex + 1)
                    .SkipWhile(token => token.Equals("as", StringComparison.OrdinalIgnoreCase) || token.Equals("to", StringComparison.OrdinalIgnoreCase) || token.Equals("with", StringComparison.OrdinalIgnoreCase))
                    .ToArray();
                value = string.Join(' ', remaining);
            }

            if (string.IsNullOrWhiteSpace(value))
            {
                value = ExtractQuotedText(step);
            }
        }

        return (target, NormalizeValue(value));
    }

    private static string ExtractTarget(string step, string[] keys)
    {
        var normalized = step.ToLowerInvariant();

        foreach (var key in keys)
        {
            if (normalized.Contains(key, StringComparison.OrdinalIgnoreCase))
            {
                return key;
            }
        }

        return string.Empty;
    }

    private static string[] Tokenize(string step)
    {
        return step.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(token => token.Trim().Trim(',', '.', ';', ':', '"', '\'', ')', '('))
            .ToArray();
    }

    private static string ExtractQuotedText(string step)
    {
        var match = Regex.Match(step, "[\"']([^\"']+)[\"']");
        return match.Success ? match.Groups[1].Value : string.Empty;
    }

    private static string NormalizeValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        value = value.Trim();
        if (value.StartsWith("\"") && value.EndsWith("\""))
        {
            return value[1..^1].Trim();
        }

        if (value.StartsWith("'") && value.EndsWith("'"))
        {
            return value[1..^1].Trim();
        }

        return value;
    }

    private static string ExtractUrl(string step)
    {
        var match = Regex.Match(step, @"(https?://[^\s,;]+)", RegexOptions.IgnoreCase);
        return match.Success ? match.Value : string.Empty;
    }

    private static int ExtractTimeout(string step)
    {
        var tokens = Tokenize(step);
        foreach (var token in tokens)
        {
            if (int.TryParse(token, out var result)) return result;
            if (token.EndsWith("s", StringComparison.OrdinalIgnoreCase) && int.TryParse(token[..^1], out result)) return result;
        }

        return 2;
    }

    private static string EscapeString(string value)
    {
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private enum ActionType
    {
        OpenUrl,
        Navigate,
        EnterText,
        Click,
        Wait,
        Select,
        Assert,
        Unknown
    }

    private record ParsedStep(ActionType ActionType, string RawText, string Value, string Target = "");
}
