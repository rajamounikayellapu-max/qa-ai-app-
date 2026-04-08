import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import ProjectPreviewPage from "./pages/ProjectPreviewPage";
import TestCasesPage from "./pages/TestCasesPage";
import LocatorMappingPage from "./pages/LocatorMappingPage";
import CodePreviewPage from "./pages/CodePreviewPage";
import CodeReviewPage from "./pages/CodeReviewPage";
import ExecutionPage from "./pages/ExecutionPage";
import DownloadPage from "./pages/DownloadPage";
import WorkflowDetails from "./pages/WorkflowDetails";
import ProjectDetails from "./pages/ProjectDetails";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-fuchsia-50 text-slate-900">
        <Sidebar />
        <TopBar />
        <main className="lg:pl-64">
          <div className="px-4 py-8 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/projects" element={<ProjectPreviewPage />} />
              <Route path="/testcases" element={<TestCasesPage />} />
              <Route path="/locators" element={<LocatorMappingPage />} />
              <Route path="/code" element={<CodePreviewPage />} />
              <Route path="/code-review" element={<CodeReviewPage />} />
              <Route path="/execution" element={<ExecutionPage />} />
              <Route path="/workflow/:id" element={<WorkflowDetails />} />
              <Route path="/project-details/:id" element={<ProjectDetails />} />
              <Route path="/download" element={<DownloadPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
