using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using QaAssistantApi.Data;
using QaAssistantApi.Models;
using QaAssistantApi.Services;

var builder = WebApplication.CreateBuilder(args);

// DB
var connectionString = builder.Configuration.GetConnectionString("Default") ?? "Data Source=qaassistant.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.WriteIndented = false;
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

builder.Services.AddScoped<IDocumentParser, WordDocumentParser>();
builder.Services.AddScoped<ITestPlanParserService, TestPlanParserService>();
builder.Services.AddScoped<IStepInterpreter, RuleBasedStepInterpreter>();
builder.Services.AddScoped<ILocatorSuggestionService, LocatorSuggestionService>();

builder.Services.AddControllers();

var app = builder.Build();

app.UseCors("AllowAll");
app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

// Create DB and seed demo test cases/defects
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var isDevelopment = app.Environment.IsDevelopment();

    if (isDevelopment)
    {
        try
        {
            db.Database.EnsureCreated();
            db.Database.OpenConnection();
            try
            {
                using var command = db.Database.GetDbConnection().CreateCommand();
                command.CommandText = "ALTER TABLE LocatorMappings ADD COLUMN StepIndex INTEGER NOT NULL DEFAULT 0";
                command.ExecuteNonQuery();
            }
            catch
            {
                // ignore if the column already exists or the database is already up to date
            }
        }
        catch (Exception ex) when (ex is SqliteException || ex is DbUpdateException || ex is InvalidOperationException)
        {
            db.Database.EnsureDeleted();
            db.Database.EnsureCreated();
        }
    }
    else
    {
        db.Database.EnsureCreated();
    }

    if (!db.TestCases.Any())
    {
        db.TestCases.AddRange(
            new TestCase { Title = "Login flow", Steps = "Open login page; enter credentials; submit", ExpectedResult = "User lands on dashboard", Status = "Open" },
            new TestCase { Title = "Password reset", Steps = "Navigate to reset page; provide email; submit", ExpectedResult = "Password reset email sent", Status = "Waiting on Dev" },
            new TestCase { Title = "Checkout validation", Steps = "Add product; checkout with invalid card", ExpectedResult = "Error message shown", Status = "Failed" }
        );
        db.SaveChanges();
    }

    if (!db.Defects.Any())
    {
        db.Defects.AddRange(
            new Defect { Title = "Login button not responsive", Description = "Button doesn’t trigger submit on first click", Priority = "High", Severity = "Major", Status = "Open", CreatedAt = DateTime.UtcNow },
            new Defect { Title = "Checkout total miscalculated", Description = "Order total excludes tax when coupon applied", Priority = "High", Severity = "Critical", Status = "In Progress", CreatedAt = DateTime.UtcNow }
        );
        db.SaveChanges();
    }
}

app.MapGet("/", () => "API is running 🚀");

app.MapPost("/api/upload", async (HttpRequest request, AppDbContext db, ITestPlanParserService parser, ILogger<Program> logger) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Content type must be multipart/form-data." });
    }

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
    {
        return Results.BadRequest(new { error = "A test plan file is required." });
    }

    if (file.Length > 25 * 1024 * 1024)
    {
        return Results.BadRequest(new { error = "File size exceeds the 25 MB limit." });
    }

    var extension = Path.GetExtension(file.FileName)?.ToLowerInvariant();
    if (extension != ".docx")
    {
        return Results.BadRequest(new { error = "Only Word documents (.docx) are supported. Please save .doc files as .docx and try again." });
    }

    logger.LogInformation($"Received upload: {file.FileName} ({file.Length} bytes)");
    
    var uploadsFolder = Path.Combine(builder.Environment.ContentRootPath, "uploads");
    Directory.CreateDirectory(uploadsFolder);
    var fileName = Path.GetRandomFileName() + extension;
    var savedPath = Path.Combine(uploadsFolder, fileName);

    await using (var stream = File.Create(savedPath))
    {
        await file.CopyToAsync(stream);
    }

    IReadOnlyList<TestCase>? parsedCases = null;
    if (extension == ".docx")
    {
        try
        {
            parsedCases = parser.ParseTestPlan(savedPath);
            logger.LogInformation($"Parser returned {parsedCases?.Count ?? 0} test cases from {file.FileName}");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to parse uploaded Word document.");
            return Results.BadRequest(new { error = "Uploaded document could not be parsed. Please ensure it is a valid .docx file." });
        }
    }

    var testCases = parsedCases?.Any() == true
        ? parsedCases.Select((item, index) => new TestCase
        {
            ExternalId = string.IsNullOrWhiteSpace(item.ExternalId) ? $"TC-{index + 1:D3}" : item.ExternalId,
            Title = item.Title,
            Steps = item.Steps,
            StepList = item.StepList,
            ExpectedResult = string.Empty, // Not provided in new service
            Status = "Parsed"
        }).ToList()
        : new List<TestCase>
        {
            new TestCase
            {
                ExternalId = "TC-001",
                Title = "Login workflow",
                Steps = "Open login page; enter username; enter password; click login",
                StepList = new List<string> { "Open login page", "Enter username", "Enter password", "Click login" },
                ExpectedResult = "Dashboard loads successfully",
                Status = "Parsed"
            },
            new TestCase
            {
                ExternalId = "TC-002",
                Title = "Search and filter",
                Steps = "Navigate to product search; enter search term; apply filter; verify results list",
                ExpectedResult = "Filtered products appear",
                Status = "Parsed"
            }
        };

    var usingFallback = parsedCases?.Any() != true;
    logger.LogInformation($"Creating test plan with {testCases.Count} test cases (fallback={usingFallback})");

    var testPlan = new TestPlan
    {
        Title = file.FileName,
        SourcePath = savedPath,
        Status = "Completed",
        CreatedAt = DateTime.UtcNow,
        TestCases = testCases
    };

    db.TestPlans.Add(testPlan);
    await db.SaveChangesAsync();
    
    logger.LogInformation($"Upload completed: TestPlan ID={testPlan.Id}, Title={testPlan.Title}, TestCases={testPlan.TestCases?.Count ?? 0}");
    
    return Results.Ok(testPlan);
});

app.MapGet("/api/testplans/{planId}/testcases", async (int planId, AppDbContext db, ILogger<Program> logger) =>
{
    logger.LogInformation($"Fetching test cases for planId={planId}");
    
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .FirstOrDefaultAsync(p => p.Id == planId);

    if (plan is null)
    {
        logger.LogWarning($"Test plan not found for planId={planId}");
        return Results.NotFound(new { error = "Test plan not found." });
    }
    
    var testCaseList = plan.TestCases?.ToList() ?? new List<TestCase>();
    var response = testCaseList.Select(testCase => new
    {
        testCase.Id,
        testCase.ExternalId,
        testCase.Title,
        testCase.Steps,
        StepList = testCase.StepList ?? WordDocumentParser.SplitSteps(testCase.Steps ?? string.Empty),
        testCase.ExpectedResult,
        testCase.Status,
        testCase.TestPlanId
    }).ToList();

    logger.LogInformation($"Returning {response.Count} test cases for planId={planId}");
    return Results.Ok(response);
});

app.MapGet("/api/locators", async (int planId, AppDbContext db) =>
{
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .FirstOrDefaultAsync(p => p.Id == planId);

    if (plan is null) return Results.NotFound(new { error = "Test plan not found." });

    var testCaseIds = plan.TestCases.Select(tc => tc.Id).ToList();
    var locators = await db.LocatorMappings
        .Where(mapping => testCaseIds.Contains(mapping.TestCaseId))
        .ToListAsync();

    return Results.Ok(locators);
});

app.MapPost("/api/locators/save", async (LocatorMappingSaveRequest request, AppDbContext db) =>
{
    var testCase = await db.TestCases.FindAsync(request.TestCaseId);
    if (testCase is null) return Results.NotFound(new { error = "Test case not found." });

    var existing = await db.LocatorMappings
        .FirstOrDefaultAsync(mapping => mapping.TestCaseId == request.TestCaseId && mapping.StepIndex == request.StepIndex);

    if (existing is not null)
    {
        existing.Name = request.Name;
        existing.Selector = request.Selector;
        existing.SelectorType = request.SelectorType;
        existing.IsDefault = request.IsDefault;
    }
    else
    {
        existing = new LocatorMapping
        {
            TestCaseId = request.TestCaseId,
            StepIndex = request.StepIndex,
            Name = request.Name,
            Selector = request.Selector,
            SelectorType = request.SelectorType,
            IsDefault = request.IsDefault
        };
        db.LocatorMappings.Add(existing);
    }

    await db.SaveChangesAsync();
    return Results.Ok(existing);
});

app.MapGet("/api/testplans", async (AppDbContext db) =>
    await db.TestPlans
        .Include(plan => plan.TestCases)
        .ToListAsync());

app.MapGet("/api/testplans/{id}", async (int id, AppDbContext db) =>
{
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .FirstOrDefaultAsync(p => p.Id == id);

    return plan is not null ? Results.Ok(plan) : Results.NotFound();
});

app.MapGet("/api/testcases/{testCaseId}/actions", async (int testCaseId, AppDbContext db, IStepInterpreter interpreter) =>
{
    var testCase = await db.TestCases.FindAsync(testCaseId);
    if (testCase is null)
    {
        return Results.NotFound(new { error = "Test case not found." });
    }

    var actions = await interpreter.InterpretAsync(testCase.Steps ?? string.Empty);
    return Results.Ok(actions);
});

app.MapPost("/api/locators/suggest", async (LocatorSuggestionRequest request, ILocatorSuggestionService suggestionService) =>
{
    var suggestion = await suggestionService.SuggestAsync(request.StepText ?? string.Empty);
    return Results.Ok(suggestion);
});

app.MapGet("/api/testcases/{testCaseId}/locators", async (int testCaseId, AppDbContext db) =>
    await db.LocatorMappings.Where(mapping => mapping.TestCaseId == testCaseId).ToListAsync());

app.MapPost("/api/testcases/{testCaseId}/locators", async (int testCaseId, AppDbContext db, LocatorMapping mapping) =>
{
    mapping.TestCaseId = testCaseId;
    db.LocatorMappings.Add(mapping);
    await db.SaveChangesAsync();
    return Results.Created($"/api/testcases/{testCaseId}/locators/{mapping.Id}", mapping);
});

app.MapPost("/api/generate/{testPlanId}", async (int testPlanId, AppDbContext db) =>
{
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .FirstOrDefaultAsync(p => p.Id == testPlanId);

    if (plan is null) return Results.NotFound(new { error = "Test plan not found." });

    var uploadsFolder = Path.Combine(builder.Environment.ContentRootPath, "uploads");
    Directory.CreateDirectory(uploadsFolder);

    var packageName = $"automation-{testPlanId}.zip";
    var packagePath = Path.Combine(uploadsFolder, packageName);

    var loginPageContent = @"using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace QA.Automation.Pages
{
    public class LoginPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public LoginPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        private IWebElement UsernameField => _driver.FindElement(By.Id(""username""));
        private IWebElement PasswordField => _driver.FindElement(By.Id(""password""));
        private IWebElement LoginButton => _driver.FindElement(By.CssSelector(""button[type='submit']""));

        public void Login(string username, string password)
        {
            UsernameField.Clear();
            UsernameField.SendKeys(username);
            PasswordField.Clear();
            PasswordField.SendKeys(password);
            LoginButton.Click();
        }
    }
}";

    var testsContent = new StringBuilder();
    testsContent.AppendLine("using NUnit.Framework;");
    testsContent.AppendLine("using OpenQA.Selenium;");
    testsContent.AppendLine("using OpenQA.Selenium.Chrome;");
    testsContent.AppendLine("using QA.Automation.Pages;");
    testsContent.AppendLine();
    testsContent.AppendLine("namespace QA.Automation.Tests");
    testsContent.AppendLine("{");
    testsContent.AppendLine("    [TestFixture]");
    testsContent.AppendLine("    public class GeneratedTests");
    testsContent.AppendLine("    {");
    testsContent.AppendLine("        private IWebDriver? _driver;");
    testsContent.AppendLine();
    testsContent.AppendLine("        [SetUp]");
    testsContent.AppendLine("        public void SetUp()");
    testsContent.AppendLine("        {");
    testsContent.AppendLine("            _driver = new ChromeDriver();");
    testsContent.AppendLine("            _driver.Manage().Window.Maximize();");
    testsContent.AppendLine("        }");
    testsContent.AppendLine();
    testsContent.AppendLine("        [TearDown]");
    testsContent.AppendLine("        public void TearDown()");
    testsContent.AppendLine("        {");
    testsContent.AppendLine("            _driver?.Quit();");
    testsContent.AppendLine("        }");
    testsContent.AppendLine();

    var stepIndex = 1;
    foreach (var testCase in plan.TestCases ?? Enumerable.Empty<TestCase>())
    {
        var sanitizedName = string.IsNullOrWhiteSpace(testCase.Title)
            ? $"GeneratedTest{stepIndex}"
            : testCase.Title.Replace(' ', '_').Replace('-', '_').Replace("/", "_").Replace("\\", "_");
        testsContent.AppendLine($"        [Test]");
        testsContent.AppendLine($"        public void {sanitizedName}()");
        testsContent.AppendLine("        {");
        testsContent.AppendLine("            var loginPage = new LoginPage(_driver!);");
        testsContent.AppendLine("            loginPage.Login(\"test@example.com\", \"Password123!\");");
        testsContent.AppendLine("            Assert.Pass(\"Generated test executed\");");
        testsContent.AppendLine("        }");
        testsContent.AppendLine();
        stepIndex++;
    }

    testsContent.AppendLine("    }");
    testsContent.AppendLine("}");

    if (File.Exists(packagePath)) File.Delete(packagePath);

    using (var zip = ZipFile.Open(packagePath, ZipArchiveMode.Create))
    {
        var pageEntry = zip.CreateEntry("Pages/LoginPage.cs");
        using (var writer = new StreamWriter(pageEntry.Open()))
        {
            writer.Write(loginPageContent);
        }

        var testEntry = zip.CreateEntry("Tests/GeneratedTests.cs");
        using (var writer = new StreamWriter(testEntry.Open()))
        {
            writer.Write(testsContent.ToString());
        }
    }

    var project = new GeneratedProject
    {
        TestPlanId = testPlanId,
        PackageName = packageName,
        PackagePath = packagePath,
        CreatedAt = DateTime.UtcNow,
        Status = "Packaged"
    };

    db.GeneratedProjects.Add(project);
    await db.SaveChangesAsync();
    return Results.Ok(project);
});

app.MapPost("/api/execute/{projectId}", async (int projectId, AppDbContext db) =>
{
    var project = await db.GeneratedProjects.FindAsync(projectId);
    if (project is null) return Results.NotFound();

    project.Status = "Executing";
    await db.SaveChangesAsync();
    return Results.Ok(new { success = true, message = "Execution queued." });
});

app.MapGet("/api/download/{projectId}", async (int projectId, AppDbContext db) =>
{
    var project = await db.GeneratedProjects.FindAsync(projectId);
    if (project is null) return Results.NotFound(new { error = "Project not found." });

    if (!File.Exists(project.PackagePath))
    {
        return Results.NotFound(new { error = "Generated package not found." });
    }

    var content = await File.ReadAllBytesAsync(project.PackagePath);
    return Results.File(content, "application/zip", project.PackageName);
});

app.MapGet("/testcases", async (AppDbContext db) =>
    await db.TestCases.ToListAsync());

app.MapPost("/testcases", async (AppDbContext db, TestCase testCase) =>
{
    db.TestCases.Add(testCase);
    await db.SaveChangesAsync();
    return Results.Created($"/testcases/{testCase.Id}", testCase);
});

app.MapPost("/generate-testcases", (TestGenerationRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Requirement))
    {
        return Results.BadRequest(new { error = "Requirement is required." });
    }

    var result = TestCaseGenerator.Generate(request.Requirement);
    return Results.Ok(result);
});

app.MapPost("/format-bug-report", (BugReportRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Note))
    {
        return Results.BadRequest(new { error = "Bug note is required." });
    }

    var report = BugReportFormatter.Format(request.Note, request.Severity);
    return Results.Ok(report);
});

app.MapGet("/metrics", async (AppDbContext db) =>
{
    var testCases = await db.TestCases.ToListAsync();
    var defects = await db.Defects.ToListAsync();
    var metrics = MetricsGenerator.Generate(testCases, defects);
    return Results.Ok(metrics);
});

app.MapGet("/defects", async (AppDbContext db) =>
    await db.Defects.ToListAsync());

app.MapPost("/defects", async (AppDbContext db, Defect defect) =>
{
    if (string.IsNullOrWhiteSpace(defect.Title) || string.IsNullOrWhiteSpace(defect.Description))
    {
        return Results.BadRequest(new { error = "Defect title and description are required." });
    }

    db.Defects.Add(defect);
    await db.SaveChangesAsync();
    return Results.Created($"/defects/{defect.Id}", defect);
});

app.MapPut("/defects/{id}", async (int id, AppDbContext db, Defect updated) =>
{
    var existing = await db.Defects.FindAsync(id);
    if (existing is null) return Results.NotFound();

    existing.Title = updated.Title;
    existing.Description = updated.Description;
    existing.Priority = updated.Priority;
    existing.Severity = updated.Severity;
    existing.Status = updated.Status;
    existing.CreatedAt = updated.CreatedAt;

    await db.SaveChangesAsync();
    return Results.Ok(existing);
});

app.MapDelete("/defects/{id}", async (int id, AppDbContext db) =>
{
    var defect = await db.Defects.FindAsync(id);
    if (defect is null) return Results.NotFound();

    db.Defects.Remove(defect);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/generate-selenium-script", (SeleniumScriptRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Steps))
    {
        return Results.BadRequest(new { error = "Steps are required." });
    }

    var result = SeleniumScriptGenerator.Generate(request.Steps);
    return Results.Ok(result);
});

app.MapPut("/testcases/{id}", async (int id, AppDbContext db, TestCase updated) =>
{
    var existing = await db.TestCases.FindAsync(id);
    if (existing is null) return Results.NotFound();

    existing.Title = updated.Title;
    existing.Steps = updated.Steps;
    existing.ExpectedResult = updated.ExpectedResult;
    existing.Status = updated.Status;

    await db.SaveChangesAsync();
    return Results.Ok(existing);
});

app.MapDelete("/testcases/{id}", async (int id, AppDbContext db) =>
{
    var testCase = await db.TestCases.FindAsync(id);
    if (testCase is null) return Results.NotFound();

    db.TestCases.Remove(testCase);
    await db.SaveChangesAsync();

    return Results.NoContent();
});

// New endpoints for AI QA Platform
app.MapGet("/api/code", async (int planId, AppDbContext db) =>
{
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .FirstOrDefaultAsync(p => p.Id == planId);

    if (plan is null) return Results.NotFound(new { error = "Test plan not found." });

    // Generate mock code files for demonstration
    var codeFiles = new[]
    {
        new
        {
            name = "LoginPage.cs",
            language = "csharp",
            content = @"using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace QA.Automation.Pages
{
    public class LoginPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public LoginPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        // Page Elements
        private IWebElement UsernameField => _driver.FindElement(By.Id(""username""));
        private IWebElement PasswordField => _driver.FindElement(By.Id(""password""));
        private IWebElement LoginButton => _driver.FindElement(By.CssSelector(""button[type='submit']""));

        // Page Actions
        public void Login(string username, string password)
        {
            UsernameField.SendKeys(username);
            PasswordField.SendKeys(password);
            LoginButton.Click();
        }
    }
}"
        },
        new
        {
            name = "LoginTests.cs",
            language = "csharp",
            content = @"using NUnit.Framework;
using QA.Automation.Pages;

[TestFixture]
public class LoginTests
{
    [Test]
    public void ValidLogin_ShouldNavigateToDashboard()
    {
        var loginPage = new LoginPage(Driver);
        loginPage.Login(""test@example.com"", ""password123"");
        Assert.IsTrue(Driver.Url.Contains(""dashboard""));
    }
}"
        }
    };

    return Results.Ok(new { planId, planTitle = plan.Title, codeFiles });
});

app.MapPost("/api/run", async (int planId, AppDbContext db) =>
{
    var plan = await db.TestPlans.FindAsync(planId);
    if (plan is null) return Results.NotFound(new { error = "Test plan not found." });

    var execution = new Execution
    {
        TestPlanId = planId,
        StartedAt = DateTime.UtcNow,
        Status = "Running",
        TotalTests = plan.TestCases?.Count ?? 0,
        PassedTests = 0,
        FailedTests = 0
    };

    db.Executions.Add(execution);
    await db.SaveChangesAsync();

    // Simulate execution completion after a delay
    _ = Task.Run(async () =>
    {
        await Task.Delay(10000); // 10 seconds delay
        execution.CompletedAt = DateTime.UtcNow;
        execution.Status = "Completed";
        execution.PassedTests = execution.TotalTests;
        execution.Logs = "All tests passed successfully";
        await db.SaveChangesAsync();
    });

    return Results.Ok(new
    {
        executionId = execution.Id,
        status = execution.Status,
        message = "Execution started successfully"
    });
});

app.MapGet("/api/workflow/{id}", async (int id, AppDbContext db) =>
{
    var plan = await db.TestPlans
        .Include(p => p.TestCases)
        .Include(p => p.Executions)
        .FirstOrDefaultAsync(p => p.Id == id);

    if (plan is null) return Results.NotFound(new { error = "Workflow not found." });

    var latestExecution = plan.Executions?.OrderByDescending(e => e.StartedAt).FirstOrDefault();

    return Results.Ok(new
    {
        id = plan.Id,
        title = plan.Title,
        status = plan.Status,
        createdAt = plan.CreatedAt,
        testCasesCount = plan.TestCases?.Count ?? 0,
        latestExecution = latestExecution != null ? new
        {
            id = latestExecution.Id,
            status = latestExecution.Status,
            startedAt = latestExecution.StartedAt,
            completedAt = latestExecution.CompletedAt,
            totalTests = latestExecution.TotalTests,
            passedTests = latestExecution.PassedTests,
            failedTests = latestExecution.FailedTests
        } : null
    });
});

app.MapGet("/api/workflows", async (AppDbContext db) =>
{
    var plans = await db.TestPlans
        .Include(p => p.TestCases)
        .Include(p => p.Executions)
        .OrderByDescending(p => p.CreatedAt)
        .ToListAsync();

    return Results.Ok(plans.Select(plan =>
    {
        var latestExecution = plan.Executions?.OrderByDescending(e => e.StartedAt).FirstOrDefault();
        return new
        {
            id = plan.Id,
            title = plan.Title,
            status = plan.Status,
            testCasesCount = plan.TestCases?.Count ?? 0,
            createdAt = plan.CreatedAt,
            latestExecutionStatus = latestExecution?.Status ?? "Not Started"
        };
    }));
});

app.MapControllers();

app.Run();

public record LocatorSuggestionRequest(string StepText);
public record LocatorMappingSaveRequest(int PlanId, int TestCaseId, int StepIndex, string Name, string Selector, string SelectorType, bool IsDefault);