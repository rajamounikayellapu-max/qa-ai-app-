import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TestCaseTable from "../components/TestCaseTable";
import { UI_TEXT } from "../uiText";

const uiText = UI_TEXT;
const TESTCASE_STORAGE_KEY = "testCases";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5100";

function parseGeneratedCase(raw) {
  const titleMatch = raw.match(/Title:\s*(.+)/);
  const stepsMatch = raw.match(/Test Steps:\s*([\s\S]*?)\n\nExpected Result:/);
  const expectedMatch = raw.match(/Expected Result:\s*([\s\S]*?)\n\nStatus:/);
  const statusMatch = raw.match(/Status:\s*(.+)/);

  return {
    title: titleMatch?.[1]?.trim() || "Generated test case",
    steps: stepsMatch?.[1]?.trim() || "",
    expectedResult: expectedMatch?.[1]?.trim() || "",
    status: statusMatch?.[1]?.trim() || "Not Executed",
    raw
  };
}

export default function TestCaseGeneratorPage() {
  const [requirement, setRequirement] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSteps, setManualSteps] = useState("");
  const [manualExpected, setManualExpected] = useState("");
  const [manualStatus, setManualStatus] = useState("Open");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [savedTestCases, setSavedTestCases] = useState([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const manualTitleRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedTestCases();
  }, []);

  useEffect(() => {
    localStorage.setItem(TESTCASE_STORAGE_KEY, JSON.stringify(savedTestCases));
    window.dispatchEvent(new Event("qa-storage-updated"));
  }, [savedTestCases]);

  useEffect(() => {
    if (isModalOpen && manualTitleRef.current) {
      manualTitleRef.current.focus();
    }
  }, [isModalOpen]);

  const clearModalForm = () => {
    setManualTitle("");
    setManualSteps("");
    setManualExpected("");
    setManualStatus("Open");
    setModalError("");
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    clearModalForm();
  };

  const handleDeleteTestCase = async (testCase) => {
    const testCaseId = testCase.id ?? testCase.Id;
    if (!testCaseId) return;

    const confirmed = window.confirm("Delete this test case? This cannot be undone.");
    if (!confirmed) return;

    setError("");
    setSaveMessage("");
    try {
      const response = await fetch(`${API_URL}/testcases/${testCaseId}`, {
        method: "DELETE"
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      setSaveMessage("Test case deleted successfully.");
      loadSavedTestCases();
    } catch (err) {
      console.error(err);
      setError("Failed to delete the test case. Please try again.");
    }
  };

  const createBugFromTestCase = (testCase) => {
    const existingBugs = JSON.parse(localStorage.getItem("bugs") || "[]");
    const cleanedTitle = (testCase.title || "selected test case").trim() || "selected test case";
    const newBug = {
      id: `bug-${Date.now()}`,
      title: `Bug from ${cleanedTitle}`,
      description: `Issue discovered while executing test case:\n\nTitle: ${cleanedTitle}\nSteps: ${testCase.steps}\nExpected: ${testCase.expectedResult}`,
      severity: "Medium",
      status: "Open",
      createdAt: new Date().toISOString(),
      linkedTestCaseIds: [String(testCase.id ?? testCase.Id ?? "")],
    };

    localStorage.setItem("bugs", JSON.stringify([newBug, ...existingBugs]));
    window.dispatchEvent(new Event("qa-storage-updated"));
    const message = `Created bug for ${cleanedTitle}.`;
    navigate("/bug-management", { state: { successMessage: message } });
  };

  const loadSavedTestCases = async () => {
    try {
      const response = await fetch(`${API_URL}/testcases`);
      if (!response.ok) throw new Error("Unable to load saved test cases.");
      const data = await response.json();
      setSavedTestCases(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load saved test cases.");
    }
  };

  const handleGenerate = async () => {
    setError("");
    setModalError("");
    setSaveMessage("");
    setResult(null);

    if (!requirement.trim()) {
      setError("Please enter a requirement or user story.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/generate-testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError("Unable to generate test cases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveTestCase = async (testCase) => {
    setError("");
    setModalError("");
    setSaveMessage("");
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/testcases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCase)
      });
      if (!response.ok) {
        const text = await response.text();
        const errorMsg = `Server ${response.status}: ${text || response.statusText}`;
        console.error("saveTestCase failed", errorMsg);
        setModalError(`Failed to save the test case. ${errorMsg}`);
        setError(`Failed to save the test case. ${errorMsg}`);
        return false;
      }
      await response.json();
      const savedTitle = testCase.title || testCase.Title || "test case";
      setSaveMessage(`Saved test case: ${savedTitle}`);
      loadSavedTestCases();
      return true;
    } catch (err) {
      console.error(err);

      // Common cause: backend API not started / wrong port
      const networkHint = err instanceof Error && err.message.includes("Failed to fetch")
        ? "Cannot connect to the backend API. Please make sure the API server is running on http://localhost:5100 and CORS is enabled."
        : "";

      const message = `Failed to save the test case. ${err?.message ?? err}`;
      setModalError(`${message} ${networkHint}`.trim());
      setError(`${message} ${networkHint}`.trim());
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateTestCase = async (testCase) => {
    const testCaseId = testCase.id ?? testCase.Id;
    if (!testCaseId) {
      setModalError("Cannot update test case without a valid ID.");
      return false;
    }

    setError("");
    setModalError("");
    setSaveMessage("");
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/testcases/${testCaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testCase)
      });

      if (!response.ok) {
        const text = await response.text();
        const errorMsg = `Server ${response.status}: ${text || response.statusText}`;
        console.error("updateTestCase failed", errorMsg);
        setModalError(`Failed to update the test case. ${errorMsg}`);
        setError(`Failed to update the test case. ${errorMsg}`);
        return false;
      }

      await response.json();
      const savedTitle = testCase.title || testCase.Title || "test case";
      setSaveMessage(`Updated test case: ${savedTitle}`);
      loadSavedTestCases();
      return true;
    } catch (err) {
      console.error(err);
      const message = `Failed to update the test case. ${err?.message ?? err}`;
      setModalError(message);
      setError(message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGenerated = async (raw) => {
    const parsed = parseGeneratedCase(raw);
    if (!parsed.title || !parsed.steps || !parsed.expectedResult) {
      setError("Generated case format is invalid and cannot be saved.");
      return;
    }

    await saveTestCase({
      Title: parsed.title,
      Steps: parsed.steps,
      ExpectedResult: parsed.expectedResult,
      Status: parsed.status
    });
  };

  const handleManualCreate = async () => {
    setModalError("");
    setSaveMessage("");

    if (!manualTitle.trim() || !manualSteps.trim() || !manualExpected.trim()) {
      setModalError("Title, steps, and expected result are required.");
      return;
    }

    const payload = {
      Title: manualTitle.trim(),
      Steps: manualSteps.trim(),
      ExpectedResult: manualExpected.trim(),
      Status: manualStatus
    };

    const saved = await saveTestCase(payload);

    if (saved) {
      clearModalForm();
      setIsModalOpen(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">{uiText.testCasePage.eyebrow}</p>
          <h1>{uiText.testCasePage.heading}</h1>
          <p className="page-description">
            {uiText.testCasePage.description}
          </p>
        </div>
        <div className="button-group">
          <button className="primary-button" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : uiText.testCasePage.generateButton}
          </button>
          <button className="primary-button" onClick={() => { clearModalForm(); setIsModalOpen(true); }}>
            {uiText.testCasePage.addButton}
          </button>
        </div>
      </div>

      <div className="form-card">
        <label htmlFor="requirement" className="form-label">
          {uiText.testCasePage.requirementLabel}
        </label>
        <textarea
          id="requirement"
          className="textarea"
          rows="6"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder={uiText.testCasePage.requirementPlaceholder}
        />
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{uiText.testCasePage.modalHeadingCreate}</h2>
              <button 
                className="modal-close" 
                onClick={handleModalClose}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <label className="form-label">{uiText.testCasePage.titleLabel}</label>
              <input
                ref={manualTitleRef}
                className="search-input"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder={uiText.testCasePage.titlePlaceholder}
              />

              <label className="form-label">{uiText.testCasePage.stepsLabel}</label>
              <textarea
                className="textarea"
                rows="5"
                value={manualSteps}
                onChange={(e) => setManualSteps(e.target.value)}
                placeholder={uiText.testCasePage.stepsPlaceholder}
              />

              <label className="form-label">{uiText.testCasePage.expectedLabel}</label>
              <textarea
                className="textarea"
                rows="4"
                value={manualExpected}
                onChange={(e) => setManualExpected(e.target.value)}
                placeholder={uiText.testCasePage.expectedPlaceholder}
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
              <button 
                className="secondary-button" 
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                {uiText.testCasePage.cancelButton}
              </button>
              <button 
                className="primary-button" 
                onClick={handleManualCreate}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : uiText.testCasePage.saveButton}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveMessage && <div className="page-alert success-text">{saveMessage}</div>}
      {error && <div className="page-alert error-text">{error}</div>}

      {result && (
        <div className="output-section">
          <div className="output-card">
            <h3>Input requirement</h3>
            <p>{result.requirement}</p>
          </div>

          <div className="card-grid">
            <div className="output-card">
              <h3>Functional test cases</h3>
              {result.functionalTestCases.map((item, index) => (
                <div key={`functional-${index}`} className="case-save-block">
                  <pre className="case-block">{item}</pre>
                  <button className="secondary-button" onClick={() => handleSaveGenerated(item)}>
                    Save to test case table
                  </button>
                </div>
              ))}
            </div>

            <div className="output-card">
              <h3>Negative test cases</h3>
              {result.negativeTestCases.map((item, index) => (
                <div key={`negative-${index}`} className="case-save-block">
                  <pre className="case-block">{item}</pre>
                  <button className="secondary-button" onClick={() => handleSaveGenerated(item)}>
                    Save to test case table
                  </button>
                </div>
              ))}
            </div>

            <div className="output-card">
              <h3>Boundary test cases</h3>
              {result.boundaryTestCases.map((item, index) => (
                <div key={`boundary-${index}`} className="case-save-block">
                  <pre className="case-block">{item}</pre>
                  <button className="secondary-button" onClick={() => handleSaveGenerated(item)}>
                    Save to test case table
                  </button>
                </div>
              ))}
            </div>

            <div className="output-card">
              <h3>Edge cases</h3>
              {result.edgeCases.map((item, index) => (
                <div key={`edge-${index}`} className="case-save-block">
                  <pre className="case-block">{item}</pre>
                  <button className="secondary-button" onClick={() => handleSaveGenerated(item)}>
                    Save to test case table
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <p className="page-eyebrow">{uiText.testCasePage.savedSectionEyebrow}</p>
          <h2>Test Case Table</h2>
          <p className="page-description">
            {uiText.testCasePage.savedSectionDescription}
          </p>
        </div>
      </div>

      <TestCaseTable
        rows={savedTestCases}
        onSave={updateTestCase}
        onDelete={handleDeleteTestCase}
        onCreateBug={createBugFromTestCase}
      />
    </div>
  );
}
