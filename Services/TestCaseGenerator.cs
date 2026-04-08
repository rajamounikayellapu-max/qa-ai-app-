using QaAssistantApi.Models;

namespace QaAssistantApi.Services;

public static class TestCaseGenerator
{
    public static TestGenerationResponse Generate(string requirement)
    {
        requirement = requirement?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(requirement))
        {
            return new TestGenerationResponse
            {
                Requirement = string.Empty,
                FunctionalTestCases = new List<string> { "No requirement provided." },
                NegativeTestCases = new List<string>(),
                BoundaryTestCases = new List<string>(),
                EdgeCases = new List<string>()
            };
        }

        var lower = requirement.ToLowerInvariant();
        return new TestGenerationResponse
        {
            Requirement = requirement,
            FunctionalTestCases = GenerateFunctionalCases(requirement, lower),
            NegativeTestCases = GenerateNegativeCases(requirement, lower),
            BoundaryTestCases = GenerateBoundaryCases(requirement, lower),
            EdgeCases = GenerateEdgeCases(requirement, lower)
        };
    }

    private static string BuildTestCase(string id, string title, string precondition, string steps, string expected, string status = "Not Executed")
    {
        return $"Test Case ID: {id}\n\nTitle: {title}\n\nPrecondition:\n{precondition}\n\nTest Steps:\n{steps}\n\nExpected Result:\n{expected}\n\nStatus: {status}";
    }

    private static List<string> GenerateFunctionalCases(string requirement, string lower)
    {
        var list = new List<string>();

        if (lower.Contains("login") || lower.Contains("sign in") || lower.Contains("email and password"))
        {
            list.Add(BuildTestCase(
                "TC_LOGIN_001",
                "Verify login with valid email and password",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter a valid email\nEnter a valid password\nClick on \"Login\"",
                "User should be logged in successfully\nDashboard or home page is displayed"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_002",
                "Verify login with valid email and valid password",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter a valid email\nEnter a valid password\nClick on \"Login\"",
                "User should be logged in successfully\nDashboard or landing page is displayed"
            ));
        }
        else
        {
            list.Add(BuildTestCase(
                "TC_GEN_001",
                $"Verify that the user can {requirement}",
                "The application is accessible\nRequired preconditions are met",
                $"Open the relevant page\nPerform the action: {requirement}\nVerify the result",
                $"The system completes the action for {requirement} successfully"
            ));
        }

        return list;
    }

    private static List<string> GenerateNegativeCases(string requirement, string lower)
    {
        var list = new List<string>();

        if (lower.Contains("login") || lower.Contains("sign in") || lower.Contains("email") || lower.Contains("password"))
        {
            list.Add(BuildTestCase(
                "TC_LOGIN_002",
                "Verify login with invalid email and valid password",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter an invalid email (e.g., wrong@example.com)\nEnter a valid password\nClick on \"Login\"",
                "User should not be logged in\nError message should be displayed (e.g., \"Invalid email or password\")"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_003",
                "Verify login with valid email and invalid password",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter a valid email\nEnter an invalid password\nClick on \"Login\"",
                "User should not be logged in\nError message should be displayed"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_004",
                "Verify login with empty email and password",
                "Application login page is accessible",
                "Open the login page\nLeave email field empty\nLeave password field empty\nClick on \"Login\"",
                "User should not be logged in\nValidation messages should be displayed for required fields"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_005",
                "Verify login with empty email field",
                "Application login page is accessible",
                "Open the login page\nLeave email field empty\nEnter a valid password\nClick on \"Login\"",
                "User should not be logged in\nValidation message for email should be displayed"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_006",
                "Verify login with empty password field",
                "Application login page is accessible",
                "Open the login page\nEnter a valid email\nLeave password field empty\nClick on \"Login\"",
                "User should not be logged in\nValidation message for password should be displayed"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_007",
                "Verify login with invalid email format",
                "Application login page is accessible",
                "Open the login page\nEnter email in invalid format (e.g., abc123)\nEnter any password\nClick on \"Login\"",
                "User should not be logged in\nEmail format validation message should be displayed"
            ));
        }
        else
        {
            list.Add(BuildTestCase(
                "TC_GEN_002",
                "Verify invalid input is rejected",
                "Application page is accessible",
                "Open the page\nEnter invalid or malformed data\nSubmit the form",
                "The system should reject invalid data and show an error message"
            ));
            list.Add(BuildTestCase(
                "TC_GEN_003",
                "Verify empty required fields show validation errors",
                "Application page is accessible",
                "Open the page\nLeave required fields empty\nSubmit the form",
                "Validation messages should be shown for required fields"
            ));
        }

        return list;
    }

    private static List<string> GenerateBoundaryCases(string requirement, string lower)
    {
        var list = new List<string>();

        if (lower.Contains("login") || lower.Contains("email") || lower.Contains("password"))
        {
            list.Add(BuildTestCase(
                "TC_LOGIN_008",
                "Verify password boundary lengths",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter a valid email\nEnter a password at the minimum allowed length\nClick on \"Login\"",
                "The password length boundary is accepted or the correct validation message is shown"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_009",
                "Verify email boundary length handling",
                "Application login page is accessible",
                "Open the login page\nEnter an email at the maximum allowed length\nEnter a valid password\nClick on \"Login\"",
                "The system should accept the input or show a length validation error"
            ));
        }
        else
        {
            list.Add(BuildTestCase(
                "TC_GEN_004",
                "Verify minimum allowed input lengths",
                "Application page is accessible",
                "Open the page\nEnter the shortest allowed values\nSubmit the form",
                "The system handles minimum allowed lengths correctly"
            ));
            list.Add(BuildTestCase(
                "TC_GEN_005",
                "Verify maximum allowed input lengths",
                "Application page is accessible",
                "Open the page\nEnter the longest allowed values\nSubmit the form",
                "The system handles maximum allowed lengths correctly or shows proper validation"
            ));
        }

        return list;
    }

    private static List<string> GenerateEdgeCases(string requirement, string lower)
    {
        var list = new List<string>();

        if (lower.Contains("login") || lower.Contains("email") || lower.Contains("password"))
        {
            list.Add(BuildTestCase(
                "TC_LOGIN_010",
                "Verify login with leading and trailing spaces",
                "User account exists\nApplication login page is accessible",
                "Open the login page\nEnter a valid email with leading/trailing spaces\nEnter a valid password\nClick on \"Login\"",
                "The system should trim input and login successfully or show a validation message"
            ));
            list.Add(BuildTestCase(
                "TC_LOGIN_011",
                "Verify login with special characters in input",
                "Application login page is accessible",
                "Open the login page\nEnter an email with special characters\nEnter a password\nClick on \"Login\"",
                "The system should reject invalid characters or handle them safely"
            ));
        }
        else
        {
            list.Add(BuildTestCase(
                "TC_GEN_006",
                "Verify whitespace-only input",
                "Application page is accessible",
                "Open the page\nEnter whitespace-only values\nSubmit the form",
                "The system should reject whitespace-only input"
            ));
            list.Add(BuildTestCase(
                "TC_GEN_007",
                "Verify input with special characters",
                "Application page is accessible",
                "Open the page\nEnter special characters into the fields\nSubmit the form",
                "The system should handle special characters safely"
            ));
        }

        return list;
    }
}
