import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5100";
const BUG_STORAGE_KEY = "bugs";
const TESTCASE_STORAGE_KEY = "testCases";

const parseStorageArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export default function MetricsPage() {
      useEffect(() => {
        const loadMetrics = async () => {
          try {
            const response = await fetch(`${API_URL}/metrics`);
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}`);
            }
            const data = await response.json();
            setMetrics(data);
          } catch (err) {
            console.error(err);
            setError("Unable to load metrics from the backend.");
          } finally {
            setLoading(false);
          }
        };
        loadMetrics();
      }, []);
    // Helper to clear the modal form fields
    function clearModalForm() {
      setManualTitle("");
      setManualSteps("");
      setManualExpected("");
      setManualStatus("Open");
      setModalError("");
    }

    // Handler for opening the create test case modal
    function handleCreateTestCaseClick() {
      clearModalForm();
      setIsModalOpen(true);
    }
  const [metrics, setMetrics] = useState({ dailyTrend: [], sprintMetrics: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [totalBugs, setTotalBugs] = useState(0);
  const [openBugs, setOpenBugs] = useState(0);
  const [closedBugs, setClosedBugs] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualSteps, setManualSteps] = useState("");
  const [manualExpected, setManualExpected] = useState("");
  const [manualStatus, setManualStatus] = useState("Open");
  const [modalError, setModalError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const latestTrend = metrics.dailyTrend.length ? metrics.dailyTrend[metrics.dailyTrend.length - 1] : { passed: 0, failed: 0, defects: 0 };
  const dailyTested = latestTrend.passed + latestTrend.failed;
  const dailyFailed = latestTrend.failed;
  const dailyBugs = latestTrend.defects;
  const dailyBlocked = latestTrend.failed > 0 ? 1 : 0;

  // Removed loadStorageCounts and all related code

  const handleManualCreate = async () => {
    setModalError("");

    if (!manualTitle.trim() || !manualSteps.trim() || !manualExpected.trim()) {
      setModalError("Title, test steps, and expected result are required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Title: manualTitle.trim(),
          Steps: manualSteps.trim(),
          ExpectedResult: manualExpected.trim(),
        })
      });
      setIsModalOpen(false);
      clearModalForm();
    } catch (err) {
      console.error(err);
      setModalError(`Failed to save test case. ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const passRate = metrics.sprintMetrics.length ? metrics.sprintMetrics[metrics.sprintMetrics.length - 1].passRate : 0;
  const defects = metrics.sprintMetrics.length ? metrics.sprintMetrics[metrics.sprintMetrics.length - 1].defects : 0;

  const exportMetrics = () => {
    const rows = [
      ["Date", "Passed", "Failed", "Defects"],
      ...metrics.dailyTrend.map((item) => [item.date, item.passed, item.failed, item.defects]),
      [],
      ["Sprint", "Pass Rate", "Defects"],
      ...metrics.sprintMetrics.map((item) => [item.sprint, `${item.passRate}%`, item.defects])
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "qa-metrics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Analytics</p>
          <h1>Test Metrics Dashboard</h1>
          <p className="page-description">
            Visualize quality trends, sprint performance, and defect status in one view.
          </p>
        </div>
        <button className="primary-button" onClick={exportMetrics} disabled={metrics.dailyTrend.length === 0}>
          Export metrics
        </button>
      </div>

      {/* <div className="summary-grid">
        <div className="metric-card">
          <div className="metric-summary-row">
            <div className="metric-summary-title">
              <span className="metric-icon" aria-hidden="true">🧪</span>
              <span className="metric-label">Total test cases</span>
            </div>
            <p className="metric-value">{totalTestCases}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-summary-row">
            <div className="metric-summary-title">
              <span className="metric-icon" aria-hidden="true">🐞</span>
              <span className="metric-label">Total bugs</span>
            </div>
            <p className="metric-value">{totalBugs}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-summary-row">
            <div className="metric-summary-title">
              <span className="metric-icon" aria-hidden="true">🚩</span>
              <span className="metric-label">Open bugs</span>
            </div>
            <p className="metric-value">{openBugs}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-summary-row">
            <div className="metric-summary-title">
              <span className="metric-icon" aria-hidden="true">✅</span>
              <span className="metric-label">Closed bugs</span>
            </div>
            <p className="metric-value">{closedBugs}</p>
          </div>
        </div>
      </div> */}

      <div className="action-panel">
        <div className="quick-actions">
          <button className="action-button" onClick={handleCreateTestCaseClick}>➕ Create Test Case</button>
          <button className="action-button" onClick={() => navigate("/testcases")}>🤖 Generate via AI</button>
          <button className="action-button" onClick={() => navigate("/bugs")}>🐞 Log Bug</button>
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create Test Case</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>

              <div className="modal-body">
                <label className="form-label">Test Case Title</label>
                <input
                  className="search-input"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Enter a short descriptive title"
                />

                <label className="form-label">Test Steps</label>
                <textarea
                  className="textarea"
                  rows="5"
                  value={manualSteps}
                  onChange={(e) => setManualSteps(e.target.value)}
                  placeholder="List the test steps here"
                />

                <label className="form-label">Expected Result</label>
                <textarea
                  className="textarea"
                  rows="4"
                  value={manualExpected}
                  onChange={(e) => setManualExpected(e.target.value)}
                  placeholder="Describe the expected result"
                />

                <label className="form-label">Status</label>
                <select
                  className="select"
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                >
                  <option>Open</option>
                  <option>Waiting on Dev</option>
                  <option>Waiting on QA</option>
                  <option>Failed</option>
                  <option>Passed</option>
                </select>

                {modalError && <div className="page-alert error-text">{modalError}</div>}
              </div>

              <div className="modal-footer">
                <button className="secondary-button" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                  Cancel
                </button>
                <button className="primary-button" onClick={handleManualCreate} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save test case"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="assistant-card">
          <div className="panel-header">
            <div>
              <h2>QA Daily Assistant</h2>
              <p className="page-description">
                One dashboard that helps you manage test cases, defects, daily status updates, and notes from testing.
              </p>
            </div>
            <span className="status-badge pending">Highly recommended</span>
          </div>

          <div className="assistant-stats">
            <div>
              <strong>✔ Tested</strong>
              <span>{dailyTested} cases</span>
            </div>
            <div>
              <strong>❌ Failed</strong>
              <span>{dailyFailed}</span>
            </div>
            <div>
              <strong>🐞 Bugs logged</strong>
              <span>{dailyBugs}</span>
            </div>
            <div>
              <strong>⏳ Blocked</strong>
              <span>{dailyBlocked}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="page-alert">Loading metrics...</div>
      ) : error ? (
        <div className="page-alert error-text">{error}</div>
      ) : (
        <div className="grid-columns">
          <div className="metric-card large-card">
            <h2>Current sprint health</h2>
            <p className="metric-value">{passRate}%</p>
            <p className="metric-meta">Pass rate</p>
            <div className="metric-row">
              <span>Open defects</span>
              <strong>{defects}</strong>
            </div>
          </div>

          <div className="metric-card">
            <h3>Daily trend</h3>
            {metrics.dailyTrend.length ? (
              <ul className="trend-list">
                {metrics.dailyTrend.map((item) => (
                  <li key={item.date}>
                    <span>{item.date}</span>
                    <strong>{item.passed}✔</strong>
                    <strong>{item.failed}✖</strong>
                    <strong>{item.defects}🐞</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-text">No daily trend available.</p>
            )}
          </div>

          <div className="metric-card">
            <h3>Sprint metrics</h3>
            {metrics.sprintMetrics.length ? (
              <div className="table-card">
                <div className="table-row header">
                  <span>Sprint</span>
                  <span>Pass rate</span>
                  <span>Defects</span>
                </div>
                {metrics.sprintMetrics.map((item) => (
                  <div key={item.sprint} className="table-row">
                    <span>{item.sprint}</span>
                    <span>{item.passRate}%</span>
                    <span>{item.defects}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted-text">No sprint data available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
