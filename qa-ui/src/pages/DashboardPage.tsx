import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Cpu, ShieldCheck, Sparkles, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { apiService, ProjectSummary } from "../services/apiService";
import { useAppContext } from "../context/AppContext";
import ProjectCard from "../components/ProjectCard";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const { setIsLoading, setError } = useAppContext();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const data = await apiService.getProjects();
        setProjects(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch projects";
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [setIsLoading, setError]);

  const metrics = useMemo(() => [
    {
      title: "Total Projects",
      value: projects.length,
      icon: <FileText className="h-6 w-6" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Test Cases",
      value: projects.reduce((acc, p) => acc + p.totalTestCases, 0),
      icon: <CheckCircle className="h-6 w-6" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Average Pass Rate",
      value: projects.length > 0 ? `${Math.round(projects.reduce((acc, p) => acc + p.passRate, 0) / projects.length)}%` : "0%",
      icon: <ShieldCheck className="h-6 w-6" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Total Failed Tests",
      value: projects.reduce((acc, p) => acc + p.failedCount, 0),
      icon: <AlertTriangle className="h-6 w-6" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ], [projects]);

  const aiInsights = useMemo(() => [
    "2 test cases missing locators",
    "1 flaky step detected in login workflow",
    "Suggest using ID selectors for better stability",
  ], []);

  return (
    <section className="space-y-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Dashboard</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">Automation Overview</h1>
        <p className="mt-3 text-slate-600">Monitor your QA automation workflows, track metrics, and get AI-powered insights.</p>
      </header>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{metric.title}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{metric.value}</p>
              </div>
              <div className={`rounded-full p-3 ${metric.bgColor}`}>
                <div className={metric.color}>{metric.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Projects */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900">Recent Projects</h2>
          <p className="mt-2 text-slate-600">Click on any project to view detailed metrics and execution status.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                status={project.status}
                lastUpdated={project.lastUpdated}
                totalTestCases={project.totalTestCases}
                passRate={project.passRate}
                failedCount={project.failedCount}
              />
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Projects Yet</h3>
                <p className="text-slate-600 mb-4">Upload your first test plan to get started with automation.</p>
                <button
                  onClick={() => navigate("/upload")}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  Upload Test Plan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900">🤖 AI Insights</h2>
          <p className="mt-2 text-slate-600">Smart recommendations to improve your automation.</p>
          <div className="mt-6 space-y-4">
            {aiInsights.map((insight, index) => (
              <div key={index} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
