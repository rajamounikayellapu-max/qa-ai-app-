import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { apiService, TestCaseResponse } from "../services/apiService";
import { useAppContext } from "../context/AppContext";
import { useProject } from "../context/ProjectContext";
import { createParsedCases, ParsedStep, ParsedTestCase } from "../utils/testCaseParser";

const ACTION_OPTIONS = [
  { value: "Click", label: "Click" },
  { value: "Input", label: "Input" },
  { value: "Select", label: "Select" },
  { value: "Assert", label: "Assert" },
  { value: "Wait", label: "Wait" }
] as const;

export default function TestCasesPage() {
  const [searchParams] = useSearchParams();
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTestPlan, setCurrentTestPlan, setError } = useAppContext();
  const { projects } = useProject();

  const currentProject = useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) : null),
    [projectId, projects]
  );

  const planId = useMemo(() => {
    if (projectId) {
      return currentProject?.testPlanId ?? currentTestPlan?.id ?? 0;
    }
    return Number(searchParams.get("planId") ?? currentTestPlan?.id ?? 0);
  }, [projectId, currentProject, searchParams, currentTestPlan]);

  const [loadingCases, setLoadingCases] = useState(false);
  const [testCases, setTestCases] = useState<ParsedTestCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dragSource, setDragSource] = useState<{ caseId: number; stepIndex: number } | null>(null);

  const filteredCases = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return testCases;

    return testCases.filter((testCase) =>
      testCase.title.toLowerCase().includes(normalized) ||
      testCase.externalId?.toLowerCase().includes(normalized) ||
      testCase.expectedResult?.toLowerCase().includes(normalized)
    );
  }, [searchTerm, testCases]);

  const activeCase = useMemo(
    () => filteredCases.find((item) => item.id === activeCaseId) ?? filteredCases[0] ?? null,
    [filteredCases, activeCaseId]
  );

  const canProceed = useMemo(() => {
    return testCases.length > 0 && testCases.every((testCase) =>
      testCase.parsedSteps.every((step) => step.description.trim().length > 0 && step.action.trim().length > 0)
    );
  }, [testCases]);

  const loadTestCases = useCallback(async (targetPlanId: number) => {
    console.log(`⏳ Loading test cases for planId=${targetPlanId}...`);
    setLoadingCases(true);
    try {
      const rawCases = await apiService.getParsedTestCases(targetPlanId);
      console.log(`📦 Raw cases received:`, rawCases);
      
      const parsed = createParsedCases(rawCases);
      console.log(`✨ Parsed cases:`, parsed);
      
      setTestCases(parsed);
      setActiveCaseId(parsed[0]?.id ?? null);

      if (parsed.length) {
        const newPlan = {
          id: targetPlanId,
          title: parsed[0]?.title ?? `Plan #${targetPlanId}`,
          status: "Completed" as const,
          createdAt: new Date().toISOString(),
          testCases: rawCases
        };
        if (!currentTestPlan || currentTestPlan.id !== targetPlanId) {
          setCurrentTestPlan(newPlan);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unable to load parsed test cases.";
      console.error(`❌ Load failed:`, errorMsg, err);
      setError(errorMsg);
    } finally {
      setLoadingCases(false);
    }
  }, [setCurrentTestPlan, setError]);

  useEffect(() => {
    if (!planId) {
      return;
    }

    console.log(`🔄 TestCases useEffect triggered for planId=${planId}`);

    if (testCases.length === 0 && !loadingCases) {
      loadTestCases(planId);
    }
  }, [currentTestPlan?.id, loadTestCases, planId, searchParams, testCases.length, loadingCases]);

  useEffect(() => {
    if (activeCaseId === null && filteredCases.length > 0) {
      setActiveCaseId(filteredCases[0].id);
    }
  }, [activeCaseId, filteredCases]);

  const updateStep = useCallback(
    (caseId: number, stepIndex: number, key: keyof Pick<ParsedStep, "description" | "action" | "wait">, value: string) => {
      setTestCases((current) =>
        current.map((testCase) => {
          if (testCase.id !== caseId) return testCase;

          return {
            ...testCase,
            parsedSteps: testCase.parsedSteps.map((step) =>
              step.stepIndex !== stepIndex
                ? step
                : {
                    ...step,
                    [key]: value,
                    status: key === "description" && value.trim().length === 0 ? "Missing Data" : step.status
                  }
            )
          };
        })
      );
    },
    []
  );

  const reorderSteps = useCallback((caseId: number, sourceIndex: number, targetIndex: number) => {
    setTestCases((current) =>
      current.map((testCase) => {
        if (testCase.id !== caseId) return testCase;

        const steps = [...testCase.parsedSteps];
        const [moved] = steps.splice(sourceIndex, 1);
        steps.splice(targetIndex, 0, moved);

        return {
          ...testCase,
          parsedSteps: steps.map((step, index) => ({ ...step, stepIndex: index }))
        };
      })
    );
  }, []);

  if (!planId) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Test cases</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">No parsed test plan available</h1>
          <p className="mt-3 text-slate-600">
            {currentProject ? (
              <>This project has not been linked to a parsed test plan yet. Upload a .docx test plan or refresh the project to load generated cases.</>
            ) : (
              <>Upload a plan first or select a parsed plan from the dashboard.</>
            )}
          </p>
          {currentProject && (
            <button
              onClick={() => navigate('/upload')}
              className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Upload a test plan
            </button>
          )}
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Test cases</p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900">Review parsed test cases</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Inspect AI-parsed test cases, edit step details, and confirm readiness before locator mapping.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={!canProceed}
              onClick={() => navigate(`/locators?planId=${planId}`)}
              className={`inline-flex items-center justify-center rounded-3xl px-6 py-3 text-sm font-semibold text-white transition ${canProceed ? "bg-indigo-600 hover:bg-indigo-500" : "bg-slate-300 text-slate-600 cursor-not-allowed"}`}
            >
              Map Locators →
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
            <span>Parsing</span>
            <span>Locator mapping</span>
            <span>Code</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="h-2 rounded-full bg-indigo-600" />
            <div className="h-2 rounded-full bg-slate-300" />
            <div className="h-2 rounded-full bg-slate-300" />
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex min-h-[60vh] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Parsed cases</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-600">{filteredCases.length} cases</span>
            </div>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search cases, steps, status..."
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-400"
            />
          </div>

          <div className="mt-5 flex-1 overflow-y-auto pr-1">
            {loadingCases ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-600">Loading parsed test cases...</div>
            ) : filteredCases.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-slate-600">No parsed test cases match your filter.</div>
            ) : (
              <div className="space-y-3">
                {filteredCases.map((testCase) => (
                  <button
                    key={testCase.id}
                    type="button"
                    onClick={() => setActiveCaseId(testCase.id)}
                    className={`w-full rounded-3xl border p-5 text-left transition ${activeCaseId === testCase.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{testCase.externalId ?? `TC-${testCase.id}`}</p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-900">{testCase.title}</h2>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${testCase.uiStatus === "Parsed" ? "bg-emerald-100 text-emerald-700" : testCase.uiStatus === "Needs Review" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {testCase.uiStatus}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600 line-clamp-2">{testCase.expectedResult}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          {activeCase ? (
            <div className="flex min-h-[60vh] flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">{activeCase.title}</h2>
                  <p className="mt-2 text-sm uppercase tracking-[0.24em] text-slate-500">{activeCase.externalId ?? `TC-${activeCase.id}`}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">{activeCase.uiStatus}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{activeCase.parsedSteps.length} steps</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Confidence {Math.round(activeCase.parsedSteps.reduce((sum, step) => sum + step.confidence, 0) / Math.max(activeCase.parsedSteps.length, 1))}%</span>
                </div>
              </div>

              <p className="text-slate-600">Edit any step inline and choose the correct action type for each independent step.</p>

              <div className="space-y-4 overflow-y-auto pr-1">
                {activeCase.parsedSteps.map((step, index) => (
                  <div
                    key={step.stepId}
                    draggable
                    onDragStart={() => setDragSource({ caseId: activeCase.id, stepIndex: index })}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (dragSource?.caseId === activeCase.id && dragSource.stepIndex !== index) {
                        reorderSteps(activeCase.id, dragSource.stepIndex, index);
                      }
                    }}
                    className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-indigo-300"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">Step {step.stepNumber}</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${step.status === "Parsed" ? "bg-emerald-100 text-emerald-700" : step.status === "Needs Review" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                            {step.status}
                          </span>
                        </div>
                        <textarea
                          value={step.description}
                          onChange={(event) => updateStep(activeCase.id, step.stepIndex, "description", event.target.value)}
                          className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400"
                          rows={3}
                        />
                      </div>

                      <div className="flex min-w-[200px] flex-col gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700">Action type</label>
                          <select
                            value={step.action}
                            onChange={(event) => updateStep(activeCase.id, step.stepIndex, "action", event.target.value)}
                            className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400"
                          >
                            {ACTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700">Wait / assertion</label>
                          <textarea
                            value={step.wait}
                            onChange={(event) => updateStep(activeCase.id, step.stepIndex, "wait", event.target.value)}
                            placeholder="Optional: wait condition or assertion"
                            className="mt-2 min-h-[120px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-100 p-8 text-center text-slate-600">
              No parsed test case is selected. Filter the left panel or upload a new plan to begin.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
