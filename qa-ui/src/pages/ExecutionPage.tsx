import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Play, Square, RotateCcw, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useAppContext } from "../context/AppContext";
import { useProject } from "../context/ProjectContext";
import { apiService, ExecutionResultResponse } from "../services/apiService";

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function ExecutionPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { setIsLoading, setError } = useAppContext();
  const { projects, currentProject } = useProject();
  const [results, setResults] = useState<ExecutionResultResponse[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    if (projectId && projects.length > 0) {
      loadResults();
    }
  }, [projectId, projects]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const loadResults = async () => {
    if (!projectId) return;

    const project = projects.find(p => p.id === projectId);
    if (!project || !project.testPlanId) return;

    setIsLoading(true);
    try {
      const data = await apiService.getExecutionResults(project.testPlanId);
      setResults(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load results";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const addLog = (level: LogEntry['level'], message: string) => {
    setLogs(prev => [...prev, {
      timestamp: new Date(),
      level,
      message
    }]);
  };

  const startPolling = (id: string) => {
    setExecutionId(id);
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes max

    pollingIntervalRef.current = setInterval(async () => {
      try {
        // In a real implementation, you'd poll the execution status
        // const status = await apiService.getExecutionStatus(id);

        pollCount++;
        const progressValue = Math.min((pollCount / maxPolls) * 100, 95);
        setProgress(progressValue);

        if (pollCount >= maxPolls) {
          // Simulate completion
          setIsRunning(false);
          setProgress(100);
          addLog('success', 'Execution completed successfully');
          clearInterval(pollingIntervalRef.current!);
          pollingIntervalRef.current = null;
          loadResults();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleRunTests = async () => {
    if (!currentProject || isRunning) return;

    setIsRunning(true);
    setProgress(0);
    setLogs([]);

    addLog('info', 'Starting test execution...');
    addLog('info', 'Initializing browser session');
    addLog('info', 'Loading test configuration');

    try {
      // In a real implementation, this would start the execution
      // const response = await apiService.executeTests(currentProject.id);
      // startPolling(response.executionId);

      // Simulate execution for demo
      setTimeout(() => addLog('success', 'Browser session initialized'), 1000);
      setTimeout(() => addLog('info', 'Loading page objects and locators'), 2000);
      setTimeout(() => addLog('success', 'Test suite loaded successfully'), 3000);
      setTimeout(() => addLog('info', 'Executing login test case'), 4000);
      setTimeout(() => addLog('success', 'Login test passed'), 6000);
      setTimeout(() => addLog('info', 'Executing dashboard validation'), 7000);
      setTimeout(() => addLog('warning', 'Dashboard load time slower than expected'), 9000);
      setTimeout(() => addLog('success', 'Dashboard validation completed'), 10000);
      setTimeout(() => addLog('info', 'Capturing screenshots'), 11000);
      setTimeout(() => addLog('success', 'Execution completed - 2 tests passed, 0 failed'), 12000);
      setTimeout(() => {
        setIsRunning(false);
        setProgress(100);
        loadResults();
      }, 13000);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 95));
      }, 1000);

      setTimeout(() => clearInterval(progressInterval), 12000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to execute tests";
      setError(errorMsg);
      addLog('error', `Execution failed: ${errorMsg}`);
      setIsRunning(false);
      setProgress(0);
    }
  };

  const handleStopExecution = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsRunning(false);
    setProgress(0);
    addLog('warning', 'Execution stopped by user');
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!currentProject) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Execution results</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">No generated project selected</h1>
          <p className="mt-3 text-slate-600">Generate and download a project before running automation execution.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Execution results</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">Run test automation</h1>
        <p className="mt-3 text-slate-600">Trigger your generated Selenium suite and review logs, screenshots, and pass/fail trends in one place.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Execution Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Run Controls */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Test Execution</h2>
                <p className="mt-2 text-slate-600">
                  {isRunning ? 'Execution in progress...' : 'Ready to run your test suite'}
                </p>
              </div>
              <div className="flex gap-3">
                {!isRunning ? (
                  <button
                    onClick={handleRunTests}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    Run Tests
                  </button>
                ) : (
                  <button
                    onClick={handleStopExecution}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}
                <button
                  onClick={() => {
                    setLogs([]);
                    setProgress(0);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Real-time Logs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Execution Log</h3>
            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No execution logs yet. Click "Run Tests" to start.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      {getLogIcon(log.level)}
                      <div className="flex-1">
                        <span className="text-slate-500 mr-2">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={`${
                          log.level === 'error' ? 'text-red-700' :
                          log.level === 'warning' ? 'text-yellow-700' :
                          log.level === 'success' ? 'text-green-700' :
                          'text-slate-700'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Status */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Status</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isRunning ? 'bg-blue-500 animate-pulse' :
                  progress === 100 ? 'bg-green-500' :
                  'bg-slate-300'
                }`} />
                <span className="text-sm font-medium">
                  {isRunning ? 'Running' : progress === 100 ? 'Completed' : 'Ready'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-2xl font-bold text-slate-900">2</p>
                  <p className="text-xs text-slate-600">Tests</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-2xl font-bold text-green-600">2</p>
                  <p className="text-xs text-slate-600">Passed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Runs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Runs</h3>
            <div className="space-y-3">
              {results.slice(0, 5).map((result, index) => (
                <div key={result.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(result.passed ? 'passed' : 'failed')}
                    <div>
                      <p className="text-sm font-medium text-slate-900">Run {index + 1}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(result.executedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    result.passed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {result.passed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No previous runs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
