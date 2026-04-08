using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;

namespace QaAssistantApi.Services;

/// <summary>
/// Interface for parsing test plans from Word documents.
/// </summary>
using QaAssistantApi.Models;

public interface ITestPlanParserService
{
    /// <summary>
    /// Parses a test plan from a Word document file path.
    /// </summary>
    /// <param name="filePath">Path to the .docx file.</param>
    /// <returns>List of parsed test cases.</returns>
    IReadOnlyList<TestCase> ParseTestPlan(string filePath);
}

/// <summary>
/// Service for parsing structured test plans from Word documents using OpenXML.
/// Handles table-based extraction, step numbering, multiline merging, and noise removal.
/// </summary>
public class TestPlanParserService : ITestPlanParserService
{
    // Header keywords for column identification
    private static readonly string[] IdHeaders = { "test case id", "test case", "tc id", "id" };
    private static readonly string[] TitleHeaders = { "test scenario", "scenario", "test description", "description", "name", "title" };
    private static readonly string[] StepsHeaders = { "test steps", "steps", "actions" };

    /// <summary>
    /// Main parsing method that opens the document and extracts test cases.
    /// </summary>
    public IReadOnlyList<TestCase> ParseTestPlan(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
            throw new ArgumentException("File path is required.", nameof(filePath));

        using var document = WordprocessingDocument.Open(filePath, false);
        var body = document.MainDocumentPart?.Document.Body;
        if (body == null)
            return Array.Empty<TestCase>();

        var testCases = new List<TestCase>();
        var tables = body.Descendants<Table>().ToList();

        if (tables.Any())
        {
            testCases.AddRange(ParseTables(tables));
        }

        // Fallback to paragraph parsing if no tables found
        if (!testCases.Any())
        {
            testCases.AddRange(ParseParagraphs(body));
        }

        return testCases;
    }

    /// <summary>
    /// Parses test cases from Word tables.
    /// Identifies columns by headers and extracts data row by row.
    /// </summary>
    private static IEnumerable<TestCase> ParseTables(IEnumerable<Table> tables)
    {
        foreach (var table in tables)
        {
            var rows = table.Elements<TableRow>().ToList();
            if (rows.Count < 2) continue; // Need at least header + one data row

            var headerRow = rows[0];
            var headerCells = headerRow.Elements<TableCell>().ToList();
            var headers = headerCells.Select(c => NormalizeHeaderText(GetCellText(c))).ToList();

            // Find column indices
            var idCol = FindColumnIndex(headers, IdHeaders);
            var titleCol = FindColumnIndex(headers, TitleHeaders);
            var stepsCol = FindColumnIndex(headers, StepsHeaders);

            if (idCol < 0 && titleCol < 0) continue; // No identifiable test case columns

            for (var rowIndex = 1; rowIndex < rows.Count; rowIndex++)
            {
                var row = rows[rowIndex];
                var cells = row.Elements<TableCell>().ToList();

                var externalId = GetCellValue(cells, idCol) ?? $"TC-{rowIndex:D3}";
                var title = GetCellValue(cells, titleCol) ?? "Untitled Test Case";
                var rawSteps = GetCellValue(cells, stepsCol) ?? string.Empty;

                if (IsHeaderRow(externalId, title) || string.IsNullOrWhiteSpace(title))
                    continue;

                // Extract and normalize steps
                var rawStepList = ExtractSteps(rawSteps);

                yield return new TestCase
                {
                    ExternalId = externalId.Trim(),
                    Title = title.Trim(),
                    Steps = string.Join("; ", rawStepList),
                    StepList = rawStepList
                };
            }
        }
    }

    /// <summary>
    /// Fallback parsing for documents without tables.
    /// Parses paragraphs for test case headers and steps.
    /// </summary>
    private static IEnumerable<TestCase> ParseParagraphs(Body body)
    {
        var paragraphs = body.Descendants<Paragraph>()
            .Select(p => GetParagraphText(p)?.Trim())
            .Where(text => !string.IsNullOrWhiteSpace(text) && !IsNoiseLine(text))
            .ToList();

        if (!paragraphs.Any())
            yield break;

        TestCase? currentCase = null;

        foreach (var para in paragraphs)
        {
            if (IsTestCaseHeader(para))
            {
                if (currentCase != null)
                    yield return currentCase;

                currentCase = new TestCase
                {
                    ExternalId = ExtractIdFromHeader(para),
                    Title = ExtractTitleFromHeader(para),
                    StepList = new List<string>()
                };
            }
            else if (currentCase != null)
            {
                // Add to steps if it's step content
                var extractedSteps = ExtractSteps(para);
                if (extractedSteps.Any())
                {
                    currentCase.StepList.AddRange(extractedSteps);
                }
            }
        }

        if (currentCase != null)
        {
            currentCase.Steps = string.Join("; ", currentCase.StepList ?? new List<string>());
            yield return currentCase;
        }
    }

    /// <summary>
    /// Extracts text from a table cell, handling multiple paragraphs.
    /// </summary>
    private static string GetCellText(TableCell cell)
    {
        var paragraphs = cell.Descendants<Paragraph>()
            .Select(p => p.InnerText?.Trim())
            .Where(text => !string.IsNullOrWhiteSpace(text));

        return string.Join("\n", paragraphs).Trim();
    }

    /// <summary>
    /// Gets cell value by column index, or null if out of bounds.
    /// </summary>
    private static string? GetCellValue(IReadOnlyList<TableCell> cells, int columnIndex)
    {
        if (columnIndex < 0 || columnIndex >= cells.Count)
            return null;

        return GetCellText(cells[columnIndex]);
    }

    /// <summary>
    /// Extracts paragraph text, handling runs and text elements.
    /// </summary>
    private static string? GetParagraphText(Paragraph para)
    {
        return para.InnerText?.Trim();
    }

    /// <summary>
    /// Finds the column index matching any of the search terms.
    /// </summary>
    private static int FindColumnIndex(IReadOnlyList<string> headers, string[] searchTerms)
    {
        for (var i = 0; i < headers.Count; i++)
        {
            var header = headers[i].ToLowerInvariant();
            if (searchTerms.Any(term => header.Contains(term)))
                return i;
        }
        return -1;
    }

    /// <summary>
    /// Normalizes header text for comparison.
    /// </summary>
    private static string NormalizeHeaderText(string raw)
    {
        return Regex.Replace(raw ?? string.Empty, @"[\s\t\r\n]+", " ", RegexOptions.Compiled)
            .Trim()
            .ToLowerInvariant();
    }

    /// <summary>
    /// Checks if a row is a header row based on content.
    /// </summary>
    private static bool IsHeaderRow(string id, string title)
    {
        var combined = (id + " " + title).ToLowerInvariant();
        return combined.Contains("test case") || combined.Contains("scenario") ||
               combined.Contains("description") || combined.Contains("steps");
    }

    /// <summary>
    /// Checks if a line is noise (metadata, notes, etc.).
    /// </summary>
    private static bool IsNoiseLine(string line)
    {
        if (string.IsNullOrWhiteSpace(line)) return true;
        var normalized = line.Trim().ToLowerInvariant();
        return normalized.Contains("note:") ||
               normalized.Contains("current version:") ||
               normalized.StartsWith("toc") ||
               normalized.Contains("table of contents");
    }

    /// <summary>
    /// Checks if a paragraph is a test case header.
    /// </summary>
    private static bool IsTestCaseHeader(string line)
    {
        return Regex.IsMatch(line, @"^(TC-\d+|Test\s+Case\s*\d+|Scenario\s+\d+|Case\s+\d+)", RegexOptions.IgnoreCase);
    }

    /// <summary>
    /// Extracts ID from a test case header.
    /// </summary>
    private static string ExtractIdFromHeader(string line)
    {
        var match = Regex.Match(line, @"(TC-\d+|Test Case\s*\d+|Scenario\s*\d+|Case\s+\d+)", RegexOptions.IgnoreCase);
        return match.Success ? match.Value.Trim() : "TC-001";
    }

    /// <summary>
    /// Extracts title from a test case header.
    /// </summary>
    private static string ExtractTitleFromHeader(string line)
    {
        var title = Regex.Replace(line, @"^(TC-\d+[:\-]?\s*|Test\s+Case\s*\d+[:\-]?\s*|Scenario\s+\d+[:\-]?\s*|Case\s+\d+[:\-]?\s*)", string.Empty, RegexOptions.IgnoreCase);
        return string.IsNullOrWhiteSpace(title) ? "Parsed Test Case" : title.Trim();
    }

    /// <summary>
    /// Extracts steps from raw text using numbered step regex.
    /// Splits on ^\d+.\s pattern and handles multiline content.
    /// </summary>
    private static List<string> ExtractSteps(string rawSteps)
    {
        if (string.IsNullOrWhiteSpace(rawSteps))
            return new List<string>();

        // Clean the raw steps text
        var cleaned = CleanStepText(rawSteps);

        // Split into lines to handle multiline
        var lines = cleaned.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(line => line.Trim())
            .Where(line => !string.IsNullOrWhiteSpace(line) && !IsNoiseLine(line))
            .ToList();

        var steps = new List<string>();
        string currentStep = "";

        foreach (var line in lines)
        {
            // Check if line starts with numbered step (e.g., "1. ", "2. ")
            if (Regex.IsMatch(line, @"^\d+\.\s"))
            {
                if (!string.IsNullOrEmpty(currentStep))
                {
                    steps.Add(currentStep.Trim());
                }
                currentStep = line;
            }
            else
            {
                // Append to current step (multiline handling)
                currentStep += " " + line;
            }
        }

        if (!string.IsNullOrEmpty(currentStep))
        {
            steps.Add(currentStep.Trim());
        }

        return steps;
    }

    /// <summary>
    /// Post-processing to merge broken lines into complete steps.
    /// Ensures numbered steps are properly merged across lines.
    /// </summary>
    private static List<string> NormalizeSteps(List<string> rawSteps)
    {
        var finalSteps = new List<string>();
        string currentStep = "";

        foreach (var line in rawSteps)
        {
            if (Regex.IsMatch(line, @"^\d+\.\s"))
            {
                if (!string.IsNullOrEmpty(currentStep))
                    finalSteps.Add(currentStep.Trim());

                currentStep = line;
            }
            else
            {
                currentStep += " " + line;
            }
        }

        if (!string.IsNullOrEmpty(currentStep))
            finalSteps.Add(currentStep.Trim());

        return finalSteps;
    }

    /// <summary>
    /// Cleans step text by removing noise and normalizing.
    /// Preserves URLs and special characters.
    /// </summary>
    private static string CleanStepText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return string.Empty;

        // Remove noise patterns
        text = Regex.Replace(text, @"(?i)\bnote\s*:\s*[^\r\n]*", "", RegexOptions.Multiline);
        text = Regex.Replace(text, @"(?i)\bcurrent\s+version\s*:\s*[^\r\n]*", "", RegexOptions.Multiline);

        // Normalize whitespace
        text = Regex.Replace(text, @"[\s\t]+", " ");
        text = Regex.Replace(text, @"\r?\n", "\n");

        return text.Trim();
    }
}
