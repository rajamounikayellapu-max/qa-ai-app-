import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiService, LocatorMappingResponse, TestCaseResponse } from "../services/apiService";
import { getStepDescriptions } from "../utils/testCaseParser";
import { useAppContext } from "../context/AppContext";

const locatorTypes = ["XPath", "CSS", "ID"] as const;

type ActionType = "click" | "input" | "select" | "verify" | "wait" | "navigate";

type StepStatus = "Parsed" | "Needs Review" | "Missing Data";

interface ParsedStep {
  stepIndex: number;
  stepNumber: number;
  text: string;
  action: string;
  status: StepStatus;
  confidence: number;
  wait?: string;
  assertion?: string;
}

interface ParsedTestCase extends Omit<TestCaseResponse, "steps"> {
  parsedSteps: ParsedStep[];
}

function detectActionType(step: string): string {
  const text = step.toLowerCase();
  if (text.includes("log into") || /https?:\/\/[^\s]+/i.test(step)) return "Navigate";
  if (text.includes("click") || text.includes("tap") || text.includes("press")) return "Click";
  if (text.includes("enter") || text.includes("type") || text.includes("fill")) return "Input";
  if (text.includes("select") || text.includes("choose") || text.includes("pick")) return "Select";
  if (text.includes("verify") || text.includes("assert") || text.includes("expect") || text.includes("confirm")) return "Assert";
  if (text.includes("wait") || text.includes("pause")) return "Wait";
  return "Click";
}

function detectStatus(step: string): StepStatus {
  if (!step.trim()) return "Missing Data";
  if (step.includes("?") || step.toLowerCase().includes("optional") || step.toLowerCase().includes("may")) return "Needs Review";
  return "Parsed";
}

function buildConfidence(status: StepStatus): number {
  if (status === "Parsed") return 92;
  if (status === "Needs Review") return 68;
  return 42;
}

function parseSteps(testCase: TestCaseResponse): ParsedStep[] {
  return getStepDescriptions(testCase).map((step) => {
    const status = detectStatus(step.description);
    return {
      stepIndex: step.stepNumber - 1,
      stepNumber: step.stepNumber,
      text: step.description,
      action: detectActionType(step.description),
      status,
      confidence: buildConfidence(status)
    };
  });
}

function createParsedCases(testCases: TestCaseResponse[]): ParsedTestCase[] {
  return testCases.map((testCase) => ({
    ...testCase,
    parsedSteps: parseSteps(testCase)
  }));
}

export default function LocatorMappingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setIsLoading, setError } = useAppContext();
  const [planId, setPlanId] = useState<number>(0);
  const [testCases, setTestCases] = useState<ParsedTestCase[]>([]);
  const [locators, setLocators] = useState<LocatorMappingResponse[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [locatorType, setLocatorType] = useState<typeof locatorTypes[number]>("XPath");
  const [locatorValue, setLocatorValue] = useState<string>("");
  const [locatorName, setLocatorName] = useState<string>("");

  const activeCase = useMemo(
    () => testCases.find((testCase) => testCase.id === selectedCaseId) ?? testCases[0] ?? null,
    [selectedCaseId, testCases]
  );

  const activeStep = useMemo(
    () => activeCase?.parsedSteps.find((step) => step.stepIndex === selectedStepIndex) ?? activeCase?.parsedSteps[0] ?? null,
    [activeCase, selectedStepIndex]
  );

  const activeLocator = useMemo(
    () =>
      locators.find(
        (locator) => locator.testCaseId === selectedCaseId && locator.stepIndex === selectedStepIndex
      ) ?? null,
    [locators, selectedCaseId, selectedStepIndex]
  );

  const noLocators = useMemo(
    () =>
      testCases
        .flatMap((testCase) =>
          testCase.parsedSteps.map((step) => ({ testCaseId: testCase.id, step }))
        )
        .filter(({ testCaseId, step }) =>
          !locators.some((mapping) => mapping.testCaseId === testCaseId && mapping.stepIndex === step.stepIndex)
        ).length,
    [locators, testCases]
  );

  const weakSelectors = useMemo(
    () => locators.filter((mapping) => mapping.selectorType === "XPath" && mapping.selector.includes("contains(") || mapping.selectorType === "CSS" && mapping.selector.includes("nth-child")),
    [locators]
  );

  const loadLocators = async (currentPlanId: number) => {
    try {
      setIsLoading(true);
      const [rawCases, rawLocators] = await Promise.all([
        apiService.getParsedTestCases(currentPlanId),
        apiService.getLocators(currentPlanId)
      ]);
      setTestCases(rawCases.map((testCase) => ({ ...testCase, parsedSteps: parseSteps(testCase) })));
      setLocators(rawLocators);
      if (rawCases.length > 0) {
        setSelectedCaseId(rawCases[0].id);
        setSelectedStepIndex(0);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unable to load locators.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const requestedPlanId = Number(searchParams.get("planId") ?? 0);
    if (requestedPlanId > 0) {
      setPlanId(requestedPlanId);
      loadLocators(requestedPlanId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeCase && testCases.length > 0) {
      setSelectedCaseId(testCases[0].id);
      setSelectedStepIndex(0);
    }
  }, [activeCase, testCases]);

  useEffect(() => {
    let active = true;
    if (activeLocator) {
      setLocatorType(activeLocator.selectorType);
      setLocatorValue(activeLocator.selector);
      setLocatorName(activeLocator.name);
      return;
    }

    if (!activeStep)
    {
      return;
    }

    apiService.suggestLocator(activeStep.text)
      .then((suggestion) => {
        if (!active) return;
        setLocatorType(suggestion.selectorType);
        setLocatorValue(suggestion.selector);
        setLocatorName(suggestion.name);
      })
      .catch(() => {
        if (!active) return;
        const lowercase = activeStep.text.toLowerCase();
        const suggestion = lowercase.includes("username")
          ? "id: username"
          : lowercase.includes("password")
          ? "id: password"
          : lowercase.includes("email")
          ? "css: input[type='email']"
          : lowercase.includes("submit")
          ? "css: button[type='submit']"
          : "xpath: //*[contains(@class, 'button') or contains(@type, 'submit')]";
        setLocatorType(suggestion.startsWith("id:") ? "ID" : suggestion.startsWith("css:") ? "CSS" : "XPath");
        setLocatorValue(suggestion.replace(/^(id:|css:|xpath:)/i, "").trim());
        setLocatorName(`Auto suggestion for ${activeStep.text}`);
      });

    return () => { active = false; };
  }, [activeStep, activeLocator]);

  const saveLocator = async () => {
    if (!activeCase || !activeStep) return;
    setIsLoading(true);
    try {
      await apiService.saveLocatorMapping(planId, {
        testCaseId: activeCase.id,
        stepIndex: activeStep.stepIndex,
        name: locatorName || `Locator for ${activeStep.text}`,
        selector: locatorValue,
        selectorType: locatorType,
        isDefault: true
      });
      await loadLocators(planId);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to save locator.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const autoMapAllLocators = async () => {
    if (!planId) return;
    setIsLoading(true);
    try {
      const savePromises = testCases.flatMap((testCase) =>
        testCase.parsedSteps.map((step) => {
          const existing = locators.find((mapping) => mapping.testCaseId === testCase.id && mapping.stepIndex === step.stepIndex);
          if (existing) return [];
          const lowercase = step.text.toLowerCase();
          const selector = lowercase.includes("username")
            ? "username"
            : lowercase.includes("password")
            ? "password"
            : lowercase.includes("email")
            ? "input[type='email']"
            : lowercase.includes("submit")
            ? "button[type='submit']"
            : "//*[contains(@class,'input') or contains(@type,'text')]";
          const selectorType = lowercase.includes("username") || lowercase.includes("password") || lowercase.includes("email")
            ? "ID"
            : lowercase.includes("submit")
            ? "CSS"
            : "XPath";

          return apiService.saveLocatorMapping(planId, {
            testCaseId: testCase.id,
            stepIndex: step.stepIndex,
            name: `Auto-mapped locator for step ${step.stepIndex + 1}`,
            selector,
            selectorType,
            isDefault: true
          });
        })
      );

      await Promise.all(savePromises);
      await loadLocators(planId);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Auto map failed.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const insights = useMemo(() => {
    return [
      `${noLocators} step${noLocators === 1 ? "" : "s"} missing locators`,
      `${weakSelectors.length} weak selector${weakSelectors.length === 1 ? "" : "s"} detected`,
      "Prefer stable IDs over dynamic XPaths"
    ];
  }, [noLocators, weakSelectors.length]);

  if (planId === 0) {
    return (
      <section className="space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Locator mapping</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">No test plan available</h1>
          <p className="mt-3 text-slate-600">Upload a test plan first and then use the locator mapping flow to add selectors step by step.</p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Locator mapping</p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-900">Map locators for every parsed step</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Select a step on the left, accept AI-assisted locator suggestions, and save stable selectors for automation code generation.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={autoMapAllLocators}
              className="rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Auto Map All Locators
            </button>
            <button
              type="button"
              onClick={() => navigate(`/code?planId=${planId}`)}
              className={`rounded-3xl px-5 py-3 text-sm font-semibold transition ${noLocators === 0 ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-200 text-slate-600 cursor-not-allowed"}`}
              disabled={noLocators !== 0}
            >
              Preview Selenium Code
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_0.85fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">Steps list</h2>
          <div className="mt-6 space-y-3">
            {testCases.flatMap((testCase) => [
              <div key={`header-${testCase.id}`} className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{testCase.externalId ?? `TC-${testCase.id}`}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{testCase.title}</h3>
              </div>,
              ...testCase.parsedSteps.map((step) => {
                const isSelected = selectedCaseId === testCase.id && selectedStepIndex === step.stepIndex;
                return (
                  <button
                    key={`${testCase.id}-${step.stepIndex}`}
                    type="button"
                    onClick={() => {
                      setSelectedCaseId(testCase.id);
                      setSelectedStepIndex(step.stepIndex);
                    }}
                    className={`w-full rounded-3xl border p-4 text-left transition ${isSelected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Step {step.stepIndex + 1}</p>
                        <p className="mt-2 text-base font-medium text-slate-900">{step.text}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${step.status === "Parsed" ? "bg-emerald-100 text-emerald-700" : step.status === "Needs Review" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                        {step.status}
                      </span>
                    </div>
                  </button>
                );
              })
            ])}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">Locator mapping panel</h2>
          <p className="mt-3 text-slate-600">Build a stable selector and persist it for the selected step.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">Selected step</label>
              <div className="rounded-3xl bg-slate-50 px-4 py-4 text-slate-900">{activeStep?.text ?? "Choose a step to map"}</div>
            </div>
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">Locator type</label>
              <select
                value={locatorType}
                onChange={(event) => setLocatorType(event.target.value as typeof locatorTypes[number])}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400"
              >
                {locatorTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">Locator expression</label>
              <textarea
                value={locatorValue}
                onChange={(event) => setLocatorValue(event.target.value)}
                className="min-h-[140px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 outline-none transition focus:border-indigo-400"
              />
            </div>
            <div>
              <label className="mb-3 block text-sm font-semibold text-slate-700">Locator label</label>
              <input
                value={locatorName}
                onChange={(event) => setLocatorName(event.target.value)}
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400"
                placeholder="Name this locator"
              />
            </div>
            <button
              type="button"
              onClick={saveLocator}
              className="inline-flex rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Save locator
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">AI insights</h2>
          <p className="mt-3 text-slate-600">Smart warnings and suggestions to keep your locators strong and stable.</p>

          <div className="mt-6 space-y-4">
            {insights.map((insight) => (
              <div key={insight} className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-700">
                <p>{insight}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl bg-white p-4">
            <p className="text-sm font-semibold text-slate-900">Best practice</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Prefer IDs when available.</li>
              <li>• Avoid fragile XPath expressions such as dynamic text and deeply nested paths.</li>
              <li>• Use CSS selectors for buttons and inputs where possible.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
