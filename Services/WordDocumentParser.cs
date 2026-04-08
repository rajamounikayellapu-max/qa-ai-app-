using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using QaAssistantApi.Models;

namespace QaAssistantApi.Services;

public interface IDocumentParser
{
    Task<ParsedTestPlan> ParseAsync(Stream documentStream);
}

public class WordDocumentParser : IDocumentParser
{
    public Task<ParsedTestPlan> ParseAsync(Stream documentStream)
    {
        using var document = WordprocessingDocument.Open(documentStream, false);
        var body = document.MainDocumentPart?.Document.Body;

        var plan = new ParsedTestPlan
        {
            Title = document.PackageProperties?.Title ?? string.Empty
        };

        // Try to parse tables first
        var tables = body?.Descendants<Table>().ToList();
        if (tables?.Any() == true)
        {
            ParseTablesForTestCases(tables, plan);
        }

        // If no test cases found, try paragraph-based parsing
        if (!plan.TestCases.Any())
        {
            ParseParagraphsForTestCases(body, plan);
        }

        // If plan title is empty, use first test case title
        if (string.IsNullOrWhiteSpace(plan.Title) && plan.TestCases.Any())
        {
            plan.Title = plan.TestCases[0].Title ?? "Uploaded Test Plan";
        }

        // Final fallback
        if (string.IsNullOrWhiteSpace(plan.Title))
        {
            plan.Title = "Uploaded Test Plan";
        }

        return Task.FromResult(plan);
    }

    private static void ParseTablesForTestCases(List<Table> tables, ParsedTestPlan plan)
    {
        foreach (var table in tables)
        {
            var rows = table.Elements<TableRow>().ToList();
            if (rows.Count < 2) continue;

            var headerRow = rows[0];
            var headerCells = headerRow.Elements<TableCell>().ToList();
            var headers = headerCells.Select(c => NormalizeLine(c.InnerText)).ToList();

            int tcIdCol = FindColumnIndex(headers, new[] { "test case id", "test case", "tc id", "id" });
            int scenarioCol = FindColumnIndex(headers, new[] { "test scenario", "scenario", "test description", "description", "name", "title" });
            int stepsCol = FindColumnIndex(headers, new[] { "test steps", "steps", "actions" });
            int expectedCol = FindColumnIndex(headers, new[] { "expected result", "expected", "result" });

            if (tcIdCol < 0 && scenarioCol < 0) continue;

            for (int i = 1; i < rows.Count; i++)
            {
                var row = rows[i];
                var cells = row.Elements<TableCell>().ToList();

                if (cells.Count == 0) continue;

                var externalId = tcIdCol >= 0 && tcIdCol < cells.Count 
                    ? NormalizeLine(cells[tcIdCol].InnerText).Trim() 
                    : $"TC-{i:D3}";
                
                var title = scenarioCol >= 0 && scenarioCol < cells.Count 
                    ? NormalizeLine(cells[scenarioCol].InnerText).Trim() 
                    : "Test Case";

                var rawSteps = stepsCol >= 0 && stepsCol < cells.Count 
                    ? cells[stepsCol].InnerText 
                    : string.Empty;

                var normalizedSteps = NormalizeStepText(rawSteps);
                var stepList = SplitSteps(rawSteps);
                var expectedResult = expectedCol >= 0 && expectedCol < cells.Count 
                    ? NormalizeLine(cells[expectedCol].InnerText).Trim() 
                    : string.Empty;

                if (IsHeaderRow(externalId, title) || string.IsNullOrWhiteSpace(title)) continue;

                plan.TestCases.Add(new ParsedTestCase
                {
                    ExternalId = string.IsNullOrWhiteSpace(externalId) ? $"TC-{plan.TestCases.Count + 1:D3}" : externalId,
                    Title = title.Length > 200 ? title.Substring(0, 200).Trim() : title.Trim(),
                    Steps = stepList.Any() ? string.Join("; ", stepList) : normalizedSteps,
                    StepList = stepList,
                    ExpectedResult = expectedResult
                });
            }
        }
    }

    private static int FindColumnIndex(List<string> headers, string[] searchTerms)
    {
        for (int i = 0; i < headers.Count; i++)
        {
            var header = headers[i].ToLowerInvariant();
            if (searchTerms.Any(term => header.Contains(term)))
                return i;
        }
        return -1;
    }

    private static bool IsHeaderRow(string id, string title)
    {
        var lower = (id + " " + title).ToLowerInvariant();
        return lower.Contains("test case") || lower.Contains("scenario") || lower.Contains("description") || 
               lower.Contains("expected") || lower.Contains("result") || lower.Contains("steps");
    }

    private static void ParseParagraphsForTestCases(Body? body, ParsedTestPlan plan)
    {
        var paragraphs = body?.Descendants<Paragraph>()
            .Select(p => NormalizeLine(p.InnerText))
            .Where(line => !string.IsNullOrWhiteSpace(line) && !IsMetadataLine(line))
            .ToList() ?? new List<string>();

        var lines = paragraphs
            .SelectMany(p => p.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            .Select(NormalizeLine)
            .Where(line => !string.IsNullOrWhiteSpace(line) && !IsMetadataLine(line))
            .ToList();

        ParsedTestCase? currentCase = null;

        foreach (var rawLine in lines)
        {
            var line = RemoveListMarker(rawLine);

            if (IsCaseHeader(line))
            {
                currentCase = new ParsedTestCase
                {
                    ExternalId = ExtractExternalId(line),
                    Title = ExtractTitle(line)
                };
                plan.TestCases.Add(currentCase);
                continue;
            }

            if (currentCase == null)
            {
                currentCase = new ParsedTestCase
                {
                    ExternalId = "TC-001",
                    Title = "Parsed Test Case"
                };
                plan.TestCases.Add(currentCase);
            }

            if (line.StartsWith("Expected", StringComparison.OrdinalIgnoreCase))
            {
                currentCase.ExpectedResult = ExtractExpectedResult(line);
                continue;
            }

            if (line.StartsWith("Steps", StringComparison.OrdinalIgnoreCase) || 
                line.StartsWith("Test Steps", StringComparison.OrdinalIgnoreCase) || 
                Regex.IsMatch(line, @"^Step\s*\d+", RegexOptions.IgnoreCase))
            {
                var extracted = ExtractSteps(line);
                currentCase.Steps = AppendSteps(currentCase.Steps, extracted);
                currentCase.StepList.AddRange(SplitSteps(extracted));
                continue;
            }

            currentCase.Steps = AppendSteps(currentCase.Steps, line);
            currentCase.StepList.AddRange(SplitSteps(line));
        }

        if (!plan.TestCases.Any() && lines.Any())
        {
            plan.TestCases.Add(new ParsedTestCase
            {
                ExternalId = "TC-001",
                Title = "Parsed Test Case",
                Steps = string.Join("; ", lines),
                ExpectedResult = string.Empty
            });
        }
    }

    private static string NormalizeLine(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var text = raw.Replace("\u2022", ";")
                      .Replace("\u00A0", " ")
                      .Replace("\u201C", "\"") // Left double quote
                      .Replace("\u201D", "\"") // Right double quote
                      .Replace("\u2018", "'")  // Left single quote
                      .Replace("\u2019", "'"); // Right single quote

        text = Regex.Replace(text, @"\\[a-zA-Z]+\s*", string.Empty);
        text = Regex.Replace(text, @"PAGEREF[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"HYPERLINK[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "Table of Contents", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "TOC\\b", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"[\u0000-\u001F\u007F-\u009F]+", " ");
        text = Regex.Replace(text, @"[\s\t]+", " ");
        text = Regex.Replace(text, @"^[-–—•\d\.\)\s]+", string.Empty);
        text = text.Trim();

        return text;
    }

    private static string NormalizeStepText(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var text = raw.Replace("\u2022", ";")
                      .Replace("\u00A0", " ")
                      .Replace("\u201C", "\"")
                      .Replace("\u201D", "\"")
                      .Replace("\u2018", "'")
                      .Replace("\u2019", "'")
                      .Replace("\u2013", "-")
                      .Replace("\u2014", "-")
                      .Replace("\u2212", "-");

        text = Regex.Replace(text, @"Current\s+Version\s*[:\-]?\s*[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"\bNote\s*[:\-]?\s*[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"\\[a-zA-Z]+\s*", string.Empty);
        text = Regex.Replace(text, @"PAGEREF[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"HYPERLINK[^\r\n]*", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "Table of Contents", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, "TOC\\b", string.Empty, RegexOptions.IgnoreCase);
        text = Regex.Replace(text, @"[\u0000-\u001F\u007F-\u009F]+", " ");
        text = Regex.Replace(text, @"\r\n|\r", "\n");
        text = Regex.Replace(text, @"[ \t]+", " ");
        text = text.Trim();

        return text;
    }

    public static List<string> SplitSteps(string rawSteps)
    {
        if (string.IsNullOrWhiteSpace(rawSteps)) return new List<string>();

        var cleaned = NormalizeStepText(rawSteps);
        cleaned = Regex.Replace(cleaned, @"^(steps?|test steps?)\s*[:\-]?\s*", string.Empty, RegexOptions.IgnoreCase).Trim();
        if (string.IsNullOrWhiteSpace(cleaned)) return new List<string>();

        cleaned = Regex.Replace(cleaned, @"\r\n|\r", "\n");
        cleaned = Regex.Replace(cleaned, @"[ \t]{2,}", " ").Trim();

        var numberedSteps = ExtractNumberedSteps(cleaned);
        if (numberedSteps.Count > 1)
            return numberedSteps;

        var lineItems = cleaned.Split('\n')
            .Select(line => Regex.Replace(line.Trim(), @"^[-–—•\s]*", string.Empty).Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line) && !IsMetadataLine(line))
            .ToList();

        if (lineItems.Count > 1)
            return lineItems;

        var fallback = Regex.Split(cleaned, @"[;\u2022•\n]+")
            .Select(item => CleanStepContent(item))
            .Where(item => !string.IsNullOrWhiteSpace(item) && !IsMetadataLine(item))
            .ToList();

        if (fallback.Count > 1)
            return fallback;

        var final = CleanStepContent(cleaned);
        return string.IsNullOrWhiteSpace(final) ? new List<string>() : new List<string> { final };
    }

    private static List<string> ExtractNumberedSteps(string text)
    {
        var matches = Regex.Matches(text,
            @"(?:^|\n)\s*(\d+)[\.\):-]\s*(.+?)(?=(?:\n\s*\d+[\.\):-]\s*)|$)",
            RegexOptions.Singleline | RegexOptions.IgnoreCase);

        var steps = new List<string>();
        foreach (Match match in matches)
        {
            var content = CleanStepContent(match.Groups[2].Value);
            if (!string.IsNullOrWhiteSpace(content))
            {
                steps.Add(content);
            }
        }

        return steps;
    }

    private static string CleanStepContent(string step)
    {
        if (string.IsNullOrWhiteSpace(step))
            return string.Empty;

        step = step.Trim();
        step = Regex.Replace(step, @"\r\n|\r|\n", " ");
        step = Regex.Replace(step, @"^[-–—•\s]+", string.Empty);
        step = Regex.Replace(step, @"\s{2,}", " ");
        step = Regex.Replace(step, @"\s*\.\.\.\s*", "...");
        return step.Trim();
    }

    private static bool IsMetadataLine(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return true;

        var normalized = line.Trim().ToLowerInvariant();
        if (normalized.Length < 2) return true;

        var garbagePatterns = new[]
        {
            "^toc$",
            "^table of contents$",
            @"^page\s*\d+$",
            "^contents$"
        };

        return garbagePatterns.Any(pattern => Regex.IsMatch(normalized, pattern, RegexOptions.IgnoreCase));
    }

    private static string RemoveListMarker(string line)
    {
        if (Regex.IsMatch(line, @"^\d+\.\s"))
            return Regex.Replace(line, @"^\d+\.\s", string.Empty).Trim();
        
        if (Regex.IsMatch(line, @"^\d+\)\s"))
            return Regex.Replace(line, @"^\d+\)\s", string.Empty).Trim();
        
        if (Regex.IsMatch(line, @"^[-–—•]\s"))
            return Regex.Replace(line, @"^[-–—•]\s", string.Empty).Trim();

        return line.Trim();
    }

    private static bool IsCaseHeader(string line)
    {
        return Regex.IsMatch(line, @"^(TC-\d+|Test\s+Case\s+\d+|Scenario\s+\d+|Case\s+\d+)", RegexOptions.IgnoreCase);
    }

    private static string ExtractExternalId(string line)
    {
        var match = Regex.Match(line, @"(TC-\d+|Test Case\s*\d+|Scenario\s*\d+|Case\s*\d+)", RegexOptions.IgnoreCase);
        return match.Success ? match.Value.Trim() : string.Empty;
    }

    private static string ExtractTitle(string line)
    {
        var title = Regex.Replace(line, @"^(TC-\d+[:\-]?\s*|Test\s+Case\s+\d+[:\-]?\s*|Scenario\s+\d+[:\-]?\s*|Case\s+\d+[:\-]?\s*)", string.Empty, RegexOptions.IgnoreCase);
        title = Regex.Replace(title, @"^\s*\|\s*", string.Empty);
        title = title.Trim();

        return string.IsNullOrWhiteSpace(title) ? "Parsed Test Case" : (title.Length > 200 ? title.Substring(0, 200).Trim() : title.Trim());
    }

    private static string ExtractExpectedResult(string line)
    {
        var index = line.IndexOf(':');
        return index >= 0 ? line.Substring(index + 1).Trim() : line.Trim();
    }

    private static string ExtractSteps(string line)
    {
        var index = line.IndexOf(':');
        var steps = index >= 0 ? line.Substring(index + 1).Trim() : line.Trim();
        return Regex.Replace(steps, "^steps?\\s*[:\\-]?\\s*", string.Empty, RegexOptions.IgnoreCase).Trim();
    }

    private static string AppendSteps(string currentSteps, string nextLine)
    {
        if (string.IsNullOrWhiteSpace(currentSteps))
            return nextLine;

        return string.Join("; ", new[] { currentSteps.TrimEnd(';', ' '), nextLine.Trim() }.Where(s => !string.IsNullOrWhiteSpace(s)));
    }
}
