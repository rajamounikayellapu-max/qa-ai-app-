using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace QaAssistantApi.ScratchApp
{
    public static class ScratchApplication
    {
        public static WebApplication BuildScratchApplication(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            builder.Host.UseDefaultServiceProvider(options => options.ValidateScopes = true);
            builder.Configuration.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                                .AddEnvironmentVariables();

            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();

            builder.Services.AddDbContext<ScratchAppDbContext>(options =>
                options.UseSqlite(builder.Configuration.GetConnectionString("Scratch") ?? "Data Source=qaassistant-scratch.db"));

            builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
            builder.Services.AddScoped<IDocumentParser, OpenXmlDocumentParser>();
            builder.Services.AddScoped<IActionInterpreter, OpenAIActionInterpreter>();
            builder.Services.AddScoped<ILocatorService, LocatorService>();
            builder.Services.AddScoped<ICodeGenerationService, SeleniumCodeGenerator>();
            builder.Services.AddScoped<IExecutionEngine, BackgroundExecutionEngine>();

            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                    policy.AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod());
            });

            var app = builder.Build();

            app.UseHttpsRedirection();
            app.UseRouting();
            app.UseCors();
            app.UseSwagger();
            app.UseSwaggerUI();
            app.UseExceptionHandler("/api/error");

            app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));
            app.MapPost("/api/upload", UploadTestPlanAsync);
            app.MapGet("/api/testplans", GetTestPlansAsync);
            app.MapPost("/api/execute/{projectId}", ExecuteProjectAsync);
            app.MapGet("/api/download/{projectId}", DownloadProjectAsync);
            app.MapGet("/api/error", (HttpContext context) =>
            {
                var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
                return Results.Problem(detail: exception?.Message, statusCode: 500);
            });

            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ScratchAppDbContext>();
                db.Database.EnsureCreated();
            }

            return app;
        }

        private static async Task<IResult> UploadTestPlanAsync(HttpRequest request,
            IDocumentParser parser,
            IFileStorage fileStorage,
            ScratchAppDbContext db,
            ILogger<Program> logger)
        {
            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new { error = "Content type must be multipart/form-data." });
            }

            var form = await request.ReadFormAsync();
            var file = form.Files.FirstOrDefault();
            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(new { error = "A valid test plan file is required." });
            }

            if (file.Length > 25 * 1024 * 1024)
            {
                return Results.BadRequest(new { error = "File size exceeds the 25 MB limit." });
            }

            var savedPath = await fileStorage.SaveAsync(file);
            await using var stream = await fileStorage.OpenReadAsync(savedPath);
            var parsedPlan = await parser.ParseAsync(stream);

            var plan = new TestPlan
            {
                Title = parsedPlan.Title,
                SourcePath = savedPath,
                Status = TestPlanStatus.Processing,
                CreatedAt = DateTime.UtcNow,
                TestCases = parsedPlan.TestCases.Select(tc => new TestCaseEntity
                {
                    ExternalId = tc.Id,
                    Title = tc.Title,
                    Steps = tc.Steps,
                    ExpectedResult = tc.ExpectedResult
                }).ToList()
            };

            db.TestPlans.Add(plan);
            await db.SaveChangesAsync();

            var backgroundJob = new BackgroundJob
            {
                TestPlanId = plan.Id,
                RequestedAt = DateTime.UtcNow,
                Status = BackgroundJobStatus.Queued
            };
            db.BackgroundJobs.Add(backgroundJob);
            await db.SaveChangesAsync();

            logger.LogInformation("Queued test plan {TestPlanId} for AI processing.", plan.Id);

            return Results.Accepted($"/api/testplans/{plan.Id}", new { plan.Id, plan.Status });
        }

        private static async Task<IResult> GetTestPlansAsync(ScratchAppDbContext db)
        {
            var plans = await db.TestPlans
                .Include(p => p.TestCases)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Results.Ok(plans);
        }

        private static async Task<IResult> ExecuteProjectAsync(int projectId,
            IExecutionEngine executionEngine,
            ScratchAppDbContext db)
        {
            var project = await db.GeneratedProjects.FindAsync(projectId);
            if (project is null)
            {
                return Results.NotFound(new { error = "Generated project not found." });
            }

            await executionEngine.EnqueueExecutionAsync(project);
            return Results.Accepted($"/api/execute/{projectId}", new { projectId, status = "Execution queued" });
        }

        private static async Task<IResult> DownloadProjectAsync(int projectId,
            ScratchAppDbContext db,
            IFileStorage fileStorage)
        {
            var project = await db.GeneratedProjects.FindAsync(projectId);
            if (project is null)
            {
                return Results.NotFound(new { error = "Generated project not found." });
            }

            var stream = await fileStorage.OpenReadAsync(project.PackagePath);
            return Results.File(stream, "application/zip", project.PackageName);
        }
    }

    public class ScratchAppDbContext : DbContext
    {
        public ScratchAppDbContext(DbContextOptions<ScratchAppDbContext> options)
            : base(options)
        {
        }

        public DbSet<TestPlan> TestPlans { get; set; } = null!;
        public DbSet<TestCaseEntity> TestCases { get; set; } = null!;
        public DbSet<LocatorMapping> LocatorMappings { get; set; } = null!;
        public DbSet<GeneratedProject> GeneratedProjects { get; set; } = null!;
        public DbSet<ExecutionResult> ExecutionResults { get; set; } = null!;
        public DbSet<BackgroundJob> BackgroundJobs { get; set; } = null!;
    }

    public enum TestPlanStatus
    {
        Processing,
        Completed,
        Failed
    }

    public enum BackgroundJobStatus
    {
        Queued,
        Running,
        Completed,
        Failed
    }

    public class TestPlan
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string SourcePath { get; set; } = string.Empty;
        public TestPlanStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public ICollection<TestCaseEntity> TestCases { get; set; } = new List<TestCaseEntity>();
    }

    public class TestCaseEntity
    {
        public int Id { get; set; }
        public string ExternalId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Steps { get; set; } = string.Empty;
        public string ExpectedResult { get; set; } = string.Empty;
        public int TestPlanId { get; set; }
        public TestPlan TestPlan { get; set; } = null!;
    }

    public class LocatorMapping
    {
        public int Id { get; set; }
        public int TestCaseId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Selector { get; set; } = string.Empty;
        public string SelectorType { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
    }

    public class GeneratedProject
    {
        public int Id { get; set; }
        public int TestPlanId { get; set; }
        public string PackageName { get; set; } = string.Empty;
        public string PackagePath { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ExecutionResult
    {
        public int Id { get; set; }
        public int GeneratedProjectId { get; set; }
        public bool Passed { get; set; }
        public string Log { get; set; } = string.Empty;
        public string ScreenshotPath { get; set; } = string.Empty;
        public DateTime ExecutedAt { get; set; }
    }

    public class BackgroundJob
    {
        public int Id { get; set; }
        public int TestPlanId { get; set; }
        public DateTime RequestedAt { get; set; }
        public BackgroundJobStatus Status { get; set; }
    }

    public class ParsedTestPlan
    {
        public string Title { get; set; } = string.Empty;
        public IReadOnlyList<ParsedTestCase> TestCases { get; set; } = Array.Empty<ParsedTestCase>();
    }

    public class ParsedTestCase
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Steps { get; set; } = string.Empty;
        public string ExpectedResult { get; set; } = string.Empty;
    }

    public class RawTestStep
    {
        public string Text { get; set; } = string.Empty;
        public int Sequence { get; set; }
    }

    public class TestStepAction
    {
        public string ActionType { get; set; } = string.Empty;
        public string Target { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;
    }

    public interface IFileStorage
    {
        Task<string> SaveAsync(IFormFile file);
        Task<Stream> OpenReadAsync(string relativePath);
    }

    public class LocalFileStorage : IFileStorage
    {
        private const string StorageRoot = "scratch-storage";

        public LocalFileStorage()
        {
            Directory.CreateDirectory(StorageRoot);
        }

        public async Task<string> SaveAsync(IFormFile file)
        {
            var fileName = Path.Combine(StorageRoot, $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}");
            await using var stream = File.Create(fileName);
            await file.CopyToAsync(stream);
            return fileName;
        }

        public Task<Stream> OpenReadAsync(string relativePath)
        {
            return Task.FromResult<Stream>(File.OpenRead(relativePath));
        }
    }

    public interface IDocumentParser
    {
        Task<ParsedTestPlan> ParseAsync(Stream documentStream);
    }

    public class OpenXmlDocumentParser : IDocumentParser
    {
        public Task<ParsedTestPlan> ParseAsync(Stream documentStream)
        {
            // This is a skeleton parser. A production implementation should use OpenXML SDK,
            // extract tables, paragraphs, and multiline steps, then sanitize noise text.
            var dummy = new ParsedTestPlan
            {
                Title = "Generated test plan from scratch parser",
                TestCases = new[]
                {
                    new ParsedTestCase { Id = "TC-001", Title = "Login", Steps = "Open login page; Enter credentials; Click sign in", ExpectedResult = "Dashboard loads" }
                }
            };

            return Task.FromResult(dummy);
        }
    }

    public interface IActionInterpreter
    {
        Task<IReadOnlyList<TestStepAction>> InterpretAsync(IEnumerable<RawTestStep> rawSteps);
    }

    public class OpenAIActionInterpreter : IActionInterpreter
    {
        public Task<IReadOnlyList<TestStepAction>> InterpretAsync(IEnumerable<RawTestStep> rawSteps)
        {
            // Placeholder for an AI provider integration.
            var actions = rawSteps.Select(step => new TestStepAction
            {
                ActionType = "navigate",
                Target = "https://example.com",
                Value = step.Text
            }).ToArray();

            return Task.FromResult<IReadOnlyList<TestStepAction>>(actions);
        }
    }

    public interface ILocatorService
    {
        Task<LocatorMapping> SuggestLocatorAsync(string elementText);
    }

    public class LocatorService : ILocatorService
    {
        public Task<LocatorMapping> SuggestLocatorAsync(string elementText)
        {
            var mapping = new LocatorMapping
            {
                Name = elementText,
                Selector = $"//div[contains(text(), '{elementText}')]|//button[contains(text(), '{elementText}')]|//*[@id='{elementText.ToLowerInvariant().Replace(' ', '-')}' ]",
                SelectorType = "XPath",
                IsDefault = true
            };

            return Task.FromResult(mapping);
        }
    }

    public interface ICodeGenerationService
    {
        Task<GeneratedProject> GenerateProjectAsync(TestPlan plan, IReadOnlyList<TestStepAction> actions);
    }

    public class SeleniumCodeGenerator : ICodeGenerationService
    {
        public Task<GeneratedProject> GenerateProjectAsync(TestPlan plan, IReadOnlyList<TestStepAction> actions)
        {
            // This skeleton returns a placeholder generated project record.
            var project = new GeneratedProject
            {
                TestPlanId = plan.Id,
                PackageName = $"qa-automation-{plan.Id}.zip",
                PackagePath = Path.Combine("scratch-storage", $"qa-automation-{plan.Id}.zip"),
                CreatedAt = DateTime.UtcNow,
                Status = "Completed"
            };

            return Task.FromResult(project);
        }
    }

    public interface IExecutionEngine
    {
        Task EnqueueExecutionAsync(GeneratedProject project);
    }

    public class BackgroundExecutionEngine : IExecutionEngine
    {
        public Task EnqueueExecutionAsync(GeneratedProject project)
        {
            // Hook into Hangfire, Azure Queue, or another background job system here.
            return Task.CompletedTask;
        }
    }
}
