import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import MetricsPage from "./pages/MetricsPage";
import TestCaseGeneratorPage from "./pages/TestCaseGeneratorPage";
import SeleniumPage from "./pages/SeleniumPage";
import BugFormatterPage from "./pages/BugFormatterPage";
import "./AppRouter.css";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/metrics" replace />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/testcases" element={<TestCaseGeneratorPage />} />
            <Route path="/selenium" element={<SeleniumPage />} />
            <Route path="/bug-management" element={<BugFormatterPage />} />
            <Route path="/bugs" element={<Navigate to="/bug-management" replace />} />
            <Route path="*" element={<Navigate to="/metrics" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
