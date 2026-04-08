using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QaAssistantApi.Data;
using QaAssistantApi.Models;

namespace QaAssistantApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProjectsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var projects = await _context.GeneratedProjects
                .Include(p => p.TestPlan)
                .Select(p => new
                {
                    id = p.Id,
                    name = p.PackageName,
                    status = p.Status,
                    lastUpdated = p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    totalTestCases = _context.TestCases.Count(tc => tc.TestPlanId == p.TestPlanId),
                    testPlanId = p.TestPlanId
                })
                .ToListAsync();

            // Calculate pass rate and failed count after fetching data
            var result = projects.Select(p => new
            {
                p.id,
                p.name,
                p.status,
                p.lastUpdated,
                p.totalTestCases,
                passRate = CalculatePassRate(_context, p.testPlanId),
                failedCount = CalculateFailedCount(_context, p.testPlanId)
            });

            return Ok(result);
        }

        [HttpGet("{id}/metrics")]
        public async Task<IActionResult> GetProjectMetrics(int id)
        {
            var project = await _context.GeneratedProjects
                .Include(p => p.TestPlan)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (project == null)
            {
                return NotFound();
            }

            var executions = await _context.Executions
                .Where(e => e.TestPlanId == project.TestPlanId)
                .ToListAsync();

            var metrics = new
            {
                totalTestCases = await _context.TestCases.CountAsync(tc => tc.TestPlanId == project.TestPlanId),
                passedTests = executions.Sum(e => e.PassedTests),
                failedTests = executions.Sum(e => e.FailedTests),
                pendingTests = executions.Count(e => e.Status == "Running"),
                executionTime = executions.Where(e => e.CompletedAt.HasValue).Sum(e => (e.CompletedAt.Value - e.StartedAt).TotalSeconds),
                passRate = executions.Any() ? (executions.Sum(e => e.PassedTests) * 100.0 / executions.Sum(e => e.TotalTests)) : 0,
                defectCount = 0, // TODO: Add TestPlanId to Defect model
                lastExecution = executions.OrderByDescending(e => e.StartedAt).FirstOrDefault()?.StartedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                trendData = GetTrendData(project.TestPlanId),
                aiInsights = GetAiInsights(project.TestPlanId)
            };

            return Ok(metrics);
        }

        private static double CalculatePassRate(AppDbContext context, int testPlanId)
        {
            var executions = context.Executions.Where(e => e.TestPlanId == testPlanId).ToList();
            if (!executions.Any()) return 0;
            var totalTests = executions.Sum(e => e.TotalTests);
            var passedTests = executions.Sum(e => e.PassedTests);
            return totalTests > 0 ? passedTests * 100.0 / totalTests : 0;
        }

        private static int CalculateFailedCount(AppDbContext context, int testPlanId)
        {
            return context.Executions.Where(e => e.TestPlanId == testPlanId).Sum(e => e.FailedTests);
        }

        private List<object> GetTrendData(int testPlanId)
        {
            // Generate sample trend data for the last 7 days
            var trendData = new List<object>();
            for (int i = 6; i >= 0; i--)
            {
                var date = DateTime.Now.AddDays(-i);
                var executions = _context.Executions
                    .Where(e => e.TestPlanId == testPlanId && e.StartedAt.Date == date.Date)
                    .ToList();

                trendData.Add(new
                {
                    date = date.ToString("MM/dd"),
                    passed = executions.Count(e => e.Status == "Passed"),
                    failed = executions.Count(e => e.Status == "Failed")
                });
            }
            return trendData;
        }

        private List<object> GetAiInsights(int testPlanId)
        {
            // Generate sample AI insights based on execution data
            var insights = new List<object>();
            var executions = _context.Executions.Where(e => e.TestPlanId == testPlanId).ToList();

            if (executions.Count > 0)
            {
                var passRate = executions.Count(e => e.Status == "Passed") * 100.0 / executions.Count;
                if (passRate < 70)
                {
                    insights.Add(new
                    {
                        type = "warning",
                        message = "Test pass rate is below 70%. Consider reviewing test cases and application stability.",
                        severity = "high"
                    });
                }

                var recentFailures = executions
                    .Where(e => e.FailedTests > 0 && e.StartedAt > DateTime.Now.AddDays(-1))
                    .Sum(e => e.FailedTests);

                if (recentFailures > 0)
                {
                    insights.Add(new
                    {
                        type = "error",
                        message = $"{recentFailures} test(s) failed in the last 24 hours. Immediate attention required.",
                        severity = "critical"
                    });
                }

                insights.Add(new
                {
                    type = "info",
                    message = "All systems operational. Test execution is proceeding as expected.",
                    severity = "low"
                });
            }
            else
            {
                insights.Add(new
                {
                    type = "info",
                    message = "No test executions found. Run tests to generate insights.",
                    severity = "low"
                });
            }

            return insights;
        }
    }
}