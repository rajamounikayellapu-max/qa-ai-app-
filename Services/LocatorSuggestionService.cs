using System.Text.RegularExpressions;

namespace QaAssistantApi.Services;

public interface ILocatorSuggestionService
{
    Task<LocatorSuggestion> SuggestAsync(string stepText);
}

public record LocatorSuggestion(string Name, string Selector, string SelectorType, bool IsDefault = true);

public class LocatorSuggestionService : ILocatorSuggestionService
{
    public Task<LocatorSuggestion> SuggestAsync(string stepText)
    {
        var text = stepText.Trim();
        var selectorType = "XPath";
        var selector = "//*[contains(@class,'button') or contains(@type,'submit')]";
        var name = "Suggested locator";

        if (text.Contains("username", StringComparison.OrdinalIgnoreCase))
        {
            selectorType = "ID";
            selector = "username";
            name = "Username field";
        }
        else if (text.Contains("password", StringComparison.OrdinalIgnoreCase))
        {
            selectorType = "ID";
            selector = "password";
            name = "Password field";
        }
        else if (text.Contains("email", StringComparison.OrdinalIgnoreCase))
        {
            selectorType = "CSS";
            selector = "input[type='email']";
            name = "Email field";
        }
        else if (text.Contains("search", StringComparison.OrdinalIgnoreCase))
        {
            selectorType = "ID";
            selector = "search";
            name = "Search field";
        }
        else if (text.Contains("submit", StringComparison.OrdinalIgnoreCase) || text.Contains("login", StringComparison.OrdinalIgnoreCase))
        {
            selectorType = "CSS";
            selector = "button[type='submit']";
            name = "Submit button";
        }
        else if (text.Contains("click", StringComparison.OrdinalIgnoreCase) && Regex.IsMatch(text, "(button|link|tab)", RegexOptions.IgnoreCase))
        {
            selectorType = "XPath";
            selector = "//*[contains(text(), '" + ExtractText(text) + "')]";
            name = "Clickable element";
        }

        return Task.FromResult(new LocatorSuggestion(name, selector, selectorType, true));
    }

    private static string ExtractText(string stepText)
    {
        var match = Regex.Match(stepText, "[\"']([^\"']+)[\"']");
        if (match.Success) return match.Groups[1].Value;

        var words = stepText.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return words.Length > 0 ? words.Last() : stepText;
    }
}
