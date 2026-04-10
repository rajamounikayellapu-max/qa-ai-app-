import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  PieChart,
  BarChart3,
  Activity,
  Play,
  Check,
  X,
  Pause
} from "lucide-react";
import { apiService, ProjectDetailResponse, ProjectMetrics, TestCaseResponse } from "../services/apiService";
import { useAppContext } from "../context/AppContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar } from "recharts";

interface ExecutionStatus {
  running: number;
  passed: number;
  failed: number;
  queued: number;
}

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setIsLoading, setError } = useAppContext();
  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({
    running: 0,
    passed: 12,
    failed: 2,
    queued: 1
  });
  const [testCases, setTestCases] = useState<TestCaseResponse[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const projectData = await apiService.getProjectById(id);
        setProject(projectData);

        const [metricsData, testCasesData] = await Promise.all([
          apiService.getProjectMetrics(id),
          projectData.testPlanId ? apiService.getParsedTestCases(projectData.testPlanId) : Promise.resolve([])
        ]);

        setMetrics(metricsData);
        setTestCases(testCasesData);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch project data";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [id, setIsLoading, setError]);

  if (!project || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const pieData = [
    { name: 'Passed', value: executionStatus.passed, color: '#10B981' },
    { name: 'Failed', value: executionStatus.failed, color: '#EF4444' },
    { name: 'Running', value: executionStatus.running, color: '#F59E0B' },
    { name: 'Queued', value: executionStatus.queued, color: '#6B7280' }
  ];

  const trendData = metrics.trend.passRate.map((rate, index) => ({
    time: `${index * 10}m`,
    passRate: rate,
    tests: metrics.trend.tests[index]
  }));

  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Project Dashboard</p>
            <h1 className="text-3xl font-semibold text-slate-900">{project.name}</h1>
          </div>
        </div>
        <p className="text-slate-600">Real-time monitoring and execution metrics for this automation project.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Test Plans</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.totalPlans}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+12%</span>
              </div>
            </div>
            <div className="rounded-full p-3 bg-blue-50">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Parsed Test Cases</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.parsedCases}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+8%</span>
              </div>
            </div>
            <div className="rounded-full p-3 bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pass Rate</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.passRate}%</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">+5%</span>
              </div>
            </div>
            <div className="rounded-full p-3 bg-emerald-50">
              <Activity className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={trendData}>
                <Line type="monotone" dataKey="passRate" stroke="#10B981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Failed Tests</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.failedTests}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">-2%</span>
              </div>
            </div>
            <div className="rounded-full p-3 bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Project Overview */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Project Overview</h2>

          <div className="space-y-6">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Execution Progress</span>
                <span>{Math.round((executionStatus.passed / (executionStatus.passed + executionStatus.failed + executionStatus.running + executionStatus.queued)) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(executionStatus.passed / (executionStatus.passed + executionStatus.failed + executionStatus.running + executionStatus.queued)) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{executionStatus.passed + executionStatus.failed}</div>
                <div className="text-sm text-slate-600">Executed</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{executionStatus.passed + executionStatus.failed + executionStatus.running + executionStatus.queued}</div>
                <div className="text-sm text-slate-600">Total</div>
              </div>
            </div>

            {/* Pie Chart */}
            <div>
              <h3 className="text-lg font-medium mb-4">Test Results Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Execution Status & AI Insights */}
        <div className="space-y-6">
          {/* Execution Status */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Execution Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Running</span>
                </div>
                <span className="font-semibold">{executionStatus.running}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Passed</span>
                </div>
                <span className="font-semibold">{executionStatus.passed}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-semibold">{executionStatus.failed}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Pause className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Queued</span>
                </div>
                <span className="font-semibold">{executionStatus.queued}</span>
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">🤖 AI Insights</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <span className="text-red-500">🔴</span>
                <div>
                  <p className="text-sm font-medium">High Risk</p>
                  <p className="text-xs text-slate-600">Login step may fail due to dynamic selectors</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-500">🟡</span>
                <div>
                  <p className="text-sm font-medium">Warning</p>
                  <p className="text-xs text-slate-600">Consider adding wait conditions</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-500">🔵</span>
                <div>
                  <p className="text-sm font-medium">Suggestion</p>
                  <p className="text-xs text-slate-600">Use data-driven test approach</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              Fix Suggestions
            </button>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">Performance Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="passRate" stroke="#10B981" strokeWidth={2} name="Pass Rate %" />
            <Line type="monotone" dataKey="tests" stroke="#3B82F6" strokeWidth={2} name="Tests Run" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}