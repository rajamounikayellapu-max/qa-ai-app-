import { useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { apiService } from "../services/apiService";

export default function DownloadPage() {
  const { currentProject, setIsLoading, setError } = useAppContext();

  const handleDownload = async () => {
    if (!currentProject) {
      setError("No project available for download");
      return;
    }

    setIsLoading(true);
    try {
      const blob = await apiService.downloadProject(currentProject.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = currentProject.packageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to download project";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (currentProject?.packagePath) {
      navigator.clipboard.writeText(currentProject.packagePath);
      alert("Artifact link copied to clipboard!");
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
        <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Download center</p>
        <h1 className="mt-4 text-4xl font-semibold text-slate-900">Export generated project</h1>
        <p className="mt-3 text-slate-600">Download the packaged Selenium automation suite and use it in your CI/CD or local test runner.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">Package contents</h2>
          <p className="mt-3 text-slate-600">Your generated project includes Page Objects, NUnit tests, utilities, and driver bootstrap files ready for execution.</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Pages</p>
              <p className="mt-2 font-semibold text-slate-900">LoginPage.cs, CheckoutPage.cs, BasePage.cs</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Test suites</p>
              <p className="mt-2 font-semibold text-slate-900">LoginTests.cs, CheckoutTests.cs</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">Utilities</p>
              <p className="mt-2 font-semibold text-slate-900">DriverFactory.cs, ScreenshotHelper.cs, WaitExtensions.cs</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-lg shadow-slate-200/40">
          <h2 className="text-xl font-semibold text-slate-900">Ready to export</h2>
          <p className="mt-3 text-slate-600">Download the zip package, or copy the artifact URL to integrate with your release pipeline.</p>
          <div className="mt-6 flex flex-col gap-4">
            <button 
              type="button"
              onClick={handleDownload}
              className="rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Download ZIP
            </button>
            <button 
              type="button"
              onClick={handleCopyLink}
              className="rounded-3xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Copy artifact link
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
