import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Download, FileText, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useProject } from '../context/ProjectContext';
import { apiService, CodeResponse } from '../services/apiService';

const CodePreviewPage = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { currentTestPlan, setError } = useAppContext();
  const { projects } = useProject();
  const navigate = useNavigate();
  const [codeFiles, setCodeFiles] = useState<CodeResponse['codeFiles']>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const planId = useMemo(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      return project?.testPlanId ?? currentTestPlan?.id ?? 0;
    }
    return currentTestPlan?.id ?? 0;
  }, [projectId, projects, currentTestPlan]);

  useEffect(() => {
    if (planId === 0) return;

    const loadCode = async () => {
      setIsLoading(true);
      try {
        const code = await apiService.getCode(planId);
        setCodeFiles(code.codeFiles);
        setSelectedIndex(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load generated code.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadCode();
  }, [planId, setError]);

  const currentFile = useMemo(() => codeFiles[selectedIndex] ?? null, [codeFiles, selectedIndex]);

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentTestPlan) {
    return (
      <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-lg">
        <h1 className="text-2xl font-bold mb-3">Code Preview</h1>
        <p className="text-slate-600">Upload a test plan first to generate Selenium C# code and page objects.</p>
        <button
          onClick={() => navigate('/upload')}
          className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          Upload a test plan
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Code Preview</h1>
          <p className="mt-2 text-sm text-slate-600">Review generated C# Selenium and POM files for your uploaded test plan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownload}
            disabled={!currentFile}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download size={16} /> Download file
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <Package size={16} /> View project
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center gap-2 text-slate-800">
            <FileText size={18} />
            <span className="font-semibold">Generated files</span>
          </div>
          <div className="space-y-2">
            {isLoading && <p className="text-sm text-slate-500">Loading generated files...</p>}
            {!isLoading && codeFiles.length === 0 && (
              <p className="text-sm text-slate-500">No generated files yet. Trigger generation from the project page.</p>
            )}
            {!isLoading && codeFiles.map((file, index) => (
              <button
                key={file.name}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${index === selectedIndex ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {file.name}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{currentFile?.name ?? 'Select a file'}</h2>
              <p className="mt-1 text-sm text-slate-500">{currentFile?.language?.toUpperCase()} code preview</p>
            </div>
          </div>
          <div className="h-[70vh] overflow-hidden rounded-3xl border border-slate-200">
            {currentFile ? (
              <Editor
                height="100%"
                language={currentFile.language}
                value={currentFile.content}
                options={{ readOnly: true, minimap: { enabled: false } }}
                theme="vs-dark"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-10 text-slate-500">Select a generated file to preview its content.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CodePreviewPage;