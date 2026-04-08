using QaAssistantApi.Models;

namespace QaAssistantApi.Services;

public static class BugReportFormatter
{
    public static BugReportResponse Format(string note, string selectedSeverity)
    {
        note = note?.Trim() ?? string.Empty;
        selectedSeverity = string.IsNullOrWhiteSpace(selectedSeverity) ? "Medium" : selectedSeverity;

        if (string.IsNullOrWhiteSpace(note))
        {
            return new BugReportResponse
            {
                Title = "Invalid bug note",
                StepsToReproduce = "Please provide a rough bug note to format.",
                ExpectedResult = "N/A",
                ActualResult = "N/A",
                SeveritySuggestion = "Low",
                SelectedSeverity = selectedSeverity
            };
        }

        var lower = note.ToLowerInvariant();

        return new BugReportResponse
        {
            Title = CreateTitle(note, lower),
            StepsToReproduce = CreateSteps(note, lower),
            ExpectedResult = CreateExpected(note, lower),
            ActualResult = CreateActual(note, lower),
            SeveritySuggestion = RecommendSeverity(lower),
            SelectedSeverity = selectedSeverity
        };
    }

    private static string CreateTitle(string note, string lower)
    {
        if (lower.Contains("login") && lower.Contains("password"))
        {
            return "Login fails when password is incorrect";
        }

        if (lower.Contains("login") && lower.Contains("not working"))
        {
            return "Login not working for valid credentials";
        }

        if (lower.Contains("register") || lower.Contains("sign up") || lower.Contains("create account"))
        {
            return "Registration flow fails under invalid input";
        }

        var firstSentence = note.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(firstSentence))
        {
            return firstSentence.Trim();
        }

        return "Bug report generated from note";
    }

    private static string CreateSteps(string note, string lower)
    {
        if (lower.Contains("login") && lower.Contains("password"))
        {
            return "1. Open the login page.\n2. Enter a valid username and an incorrect password.\n3. Click the login button.\n4. Observe the login failure.";
        }

        if (lower.Contains("when") || lower.Contains("after"))
        {
            return "1. Follow the scenario described in the note.\n2. Reproduce the conditions that trigger the issue.\n3. Confirm the buggy behavior occurs consistently.";
        }

        return "1. Reproduce the scenario described in the note.\n2. Watch for the buggy behavior.\n3. Document the outcome.";
    }

    private static string CreateExpected(string note, string lower)
    {
        if (lower.Contains("login"))
        {
            return "The user should be able to log in successfully with valid credentials.";
        }

        if (lower.Contains("submit") || lower.Contains("save") || lower.Contains("upload"))
        {
            return "The action should complete successfully and show a confirmation message.";
        }

        return "The feature should behave correctly according to requirements without any errors.";
    }

    private static string CreateActual(string note, string lower)
    {
        if (lower.Contains("not working") || lower.Contains("fails") || lower.Contains("error"))
        {
            return "The action fails or produces an unexpected error instead of completing successfully.";
        }

        return "The application behaves incorrectly or does not meet the expected result.";
    }

    private static string RecommendSeverity(string lower)
    {
        if (lower.Contains("crash") || lower.Contains("data loss") || lower.Contains("blocker") || lower.Contains("unable to") || lower.Contains("cannot"))
        {
            return "High";
        }

        if (lower.Contains("slow") || lower.Contains("delay") || lower.Contains("timeout") || lower.Contains("error") || lower.Contains("fails"))
        {
            return "Medium";
        }

        return "Low";
    }
}
