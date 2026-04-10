import { ChangeEvent, DragEvent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "../services/apiService";
import { useAppContext } from "../context/AppContext";
import { useProject } from "../context/ProjectContext";
import RecentProjects from "../components/RecentProjects";
import PageHeader from "../components/PageHeader";

export default function UploadPage() {
  const [fileName, setFileName] = useState<string>("");
  const [status, setStatus] = useState<string>("Drag and drop a Word test plan or browse to upload.");
  const navigate = useNavigate();
  const { setCurrentTestPlan, setIsLoading, setError } = useAppContext();
  const { createProject, setCurrentProject, setProjects } = useProject();

  const handleFile = useCallback(async (file?: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setError("Only Word documents (.docx) are supported.");
      setStatus("Upload cancelled due to unsupported file type.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("File size exceeds the 25 MB limit.");
      setStatus("Upload cancelled due to file size.");
      return;
    }

    const backendHealthy = await apiService.checkHealth();
    if (!backendHealthy) {
      setError("Unable to reach the backend API. Make sure the .NET API is running on localhost:5100.");
      setStatus("Upload aborted: backend unreachable.");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setStatus("Creating project...");

    try {
      // Create project first
      const projectName = file.name.replace(/\.docx$/i, "");
      const project = await createProject(projectName);
      console.log(`✅ Project created:`, project);

      setStatus("Uploading and processing...");

      // Upload file linked to project
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`/api/project/${project.id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const payload = await uploadResponse.text();
        const message = payload ? payload : "Upload failed";
        throw new Error(message);
      }

      const payload = await uploadResponse.json();
      const plan = payload.testPlan ?? payload;
      const updatedProject = payload.project ?? project;

      console.log(`✅ Upload successful! TestPlan:`, plan);
      console.log(`   ID: ${plan.id}, Title: ${plan.title}, TestCases: ${plan.testCases?.length ?? 0}`);
      console.log(`✅ Updated project:`, updatedProject);

      setCurrentTestPlan(plan);
      setCurrentProject(updatedProject);
      setProjects((prev) => prev.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      setStatus(`Project created successfully. Redirecting to test cases...`);
      navigate(`/project/${project.id}/testcases`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      console.error(`❌ Upload failed:`, errorMsg, err);
      setError(errorMsg);
      setStatus(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [createProject, setCurrentTestPlan, setIsLoading, setError, navigate, setCurrentProject, setProjects]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length === 0) return;
      handleFile(event.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const handleBrowse = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
  }, [handleFile]);

  return (
    <section className="space-y-6">
      <PageHeader
        label="Upload"
        title="Import your test plan"
        description="Securely upload structured Word plans and convert them into parsed test cases ready for locator mapping."
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <div
            className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-indigo-400"
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
          >
            <div className="rounded-full bg-indigo-100 p-4 text-3xl text-indigo-600">📄</div>
            <h2 className="text-xl font-semibold text-slate-900">Drag & drop test plan</h2>
            <p className="max-w-lg text-sm text-slate-600">Upload .docx documents and automatically extract parsed test cases and step definitions.</p>
            <label className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
              Browse file
              <input type="file" accept=".docx" className="sr-only" onChange={handleBrowse} />
            </label>
          </div>

          <div className="mt-6 rounded-3xl bg-slate-100 p-5 text-sm text-slate-700">
            <p>{status}</p>
            {fileName && <p className="mt-2 text-slate-800">Uploaded: <span className="font-semibold text-slate-900">{fileName}</span></p>}
          </div>
        </div>

        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">File validation</h2>
            <p className="mt-2 text-slate-600">We validate file type, size, and upload integrity before sending content to the backend parser.</p>
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Max file size</span>
              <span className="font-semibold text-slate-900">25 MB</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Uploaded file type</span>
              <span className="font-semibold text-emerald-700">.docx</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-600">Parsing result ready</span>
              <span className="font-semibold text-slate-700">Auto-redirects to /testcases</span>
            </div>
          </div>
        </div>
      </div>

      <RecentProjects />
    </section>
  );
}
