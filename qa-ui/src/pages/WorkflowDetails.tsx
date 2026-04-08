import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiService, WorkflowDetail } from "../services/apiService";
import { CheckCircle, Clock, XCircle, Play, FileText } from "lucide-react";

export default function WorkflowDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflow = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiService.getWorkflowById(Number(id));
      setWorkflow(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflow();
    const interval = setInterval(fetchWorkflow, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && !workflow) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Workflow details</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Loading...</h1>
        </header>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Workflow details</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Error</h1>
          <p className="mt-3 text-slate-600">{error}</p>
        </header>
      </section>
    );
  }

  if (!workflow) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Workflow details</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Workflow not found</h1>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Workflow details</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">{workflow.title}</h1>
        <p className="mt-3 text-slate-600">
          Created on {new Date(workflow.createdAt).toLocaleDateString()} • {workflow.testCasesCount} test cases
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status Overview */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Status Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(workflow.status)}
              <div>
                <p className="font-medium text-slate-900">Workflow Status</p>
                <p className="text-sm text-slate-600 capitalize">{workflow.status}</p>
              </div>
            </div>

            {workflow.latestExecution && (
              <div className="flex items-center gap-3">
                {getStatusIcon(workflow.latestExecution.status)}
                <div>
                  <p className="font-medium text-slate-900">Latest Execution</p>
                  <p className="text-sm text-slate-600">
                    {workflow.latestExecution.passedTests}/{workflow.latestExecution.totalTests} tests passed
                  </p>
                  <p className="text-xs text-slate-500">
                    Started: {new Date(workflow.latestExecution.startedAt).toLocaleString()}
                    {workflow.latestExecution.completedAt &&
                      ` • Completed: ${new Date(workflow.latestExecution.completedAt).toLocaleString()}`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/execution')}
              className="w-full flex items-center gap-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Play className="h-4 w-4" />
              Run Execution
            </button>
            <button
              onClick={() => navigate('/code')}
              className="w-full flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              <FileText className="h-4 w-4" />
              View Generated Code
            </button>
          </div>
        </div>
      </div>

      {/* Execution Details */}
      {workflow.latestExecution && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Latest Execution Details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-900">{workflow.latestExecution.totalTests}</p>
              <p className="text-sm text-slate-600">Total Tests</p>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-2xl font-bold text-green-600">{workflow.latestExecution.passedTests}</p>
              <p className="text-sm text-slate-600">Passed</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-2xl font-bold text-red-600">{workflow.latestExecution.failedTests}</p>
              <p className="text-sm text-slate-600">Failed</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}