using Microsoft.AspNetCore.Mvc;
using QaAssistantApi.Data;
using QaAssistantApi.Models;

namespace QaAssistantApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestCasesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestCasesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(_context.TestCases.ToList());
        }

        [HttpPost]
        public IActionResult Create(TestCase testCase)
        {
            _context.TestCases.Add(testCase);
            _context.SaveChanges();
            return Ok(testCase);
        }
    }
}