using Microsoft.EntityFrameworkCore;
using QaAssistantApi.Models;

namespace QaAssistantApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }

        public DbSet<TestPlan> TestPlans { get; set; }
        public DbSet<TestCase> TestCases { get; set; }
        public DbSet<Step> Steps { get; set; }
        public DbSet<Execution> Executions { get; set; }
        public DbSet<LocatorMapping> LocatorMappings { get; set; }
        public DbSet<GeneratedProject> GeneratedProjects { get; set; }
        public DbSet<Defect> Defects { get; set; }
    }
}