import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { apiService } from '../services/apiService';
import PageHeader from '../components/PageHeader';

export default function ProjectPreviewPage() {
  const { currentTestPlan, currentProject, setCurrentProject, setIsLoading, setError } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!currentTestPlan) return;
    setIsGenerating(true);
    setIsLoading(true);
    try {
      const project = await apiService.generateCode(currentTestPlan.id);
      setCurrentProject(project);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate automation package.';
      setError(message);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        label="Generated project"
        title="Project preview"
        description="Generate a C# Selenium automation package from your uploaded test plan."
      />

      {!currentTestPlan ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">No test plan selected</h2>
          <p className="mt-3 text-slate-600">Upload a Word test plan first and review parsed cases before generating code.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
            <h2 className="text-xl font-semibold text-slate-900">Project snapshot</h2>
            <p className="mt-3 text-slate-600">Use the button below to generate a Selenium C# automation package with POM structure.</p>
            <div className="mt-6 space-y-4 rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Test plan</span>
                <span className="font-semibold text-slate-900">{currentTestPlan.title}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Status</span>
                <span className="font-semibold text-slate-900">{currentTestPlan.status}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Test cases</span>
                <span className="font-semibold text-slate-900">{currentTestPlan.testCases.length}</span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 inline-flex items-center justify-center rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isGenerating ? 'Generating...' : 'Generate C# Selenium Package'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
            <h2 className="text-xl font-semibold text-slate-900">Artifacts</h2>
            {currentProject ? (
              <div className="mt-4 space-y-4 text-slate-700">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Package</p>
                  <p className="mt-2 font-semibold text-slate-900">{currentProject.packageName}</p>
                  <p className="mt-1 text-xs text-slate-500">Ready to download from the Download page.</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Generated at</p>
                  <p className="mt-2 font-semibold text-slate-900">{new Date(currentProject.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-slate-600">
                No package generated yet. Once complete, download the generated zip from the Download page.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
