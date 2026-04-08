import { useEffect, useState } from "react";
import TestCaseSelector from "./TestCaseSelector";

const severityOptions = ["Low", "Medium", "High", "Critical"];
const statusOptions = ["Open", "In Progress", "Closed"];

export default function BugForm({ open, onClose, onSave, bug, testCases }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [status, setStatus] = useState("Open");
  const [linkedTestCaseIds, setLinkedTestCaseIds] = useState([]);

  useEffect(() => {
    if (open) {
      if (bug) {
        setTitle(bug.title || "");
        setDescription(bug.description || "");
        setSeverity(bug.severity || "Medium");
        setStatus(bug.status || "Open");
        setLinkedTestCaseIds(bug.linkedTestCaseIds || []);
      } else {
        setTitle("");
        setDescription("");
        setSeverity("Medium");
        setStatus("Open");
        setLinkedTestCaseIds([]);
      }
    }
  }, [bug, open]);

  const toggleTestCase = (testCaseId) => {
    setLinkedTestCaseIds((current) =>
      current.includes(testCaseId)
        ? current.filter((id) => id !== testCaseId)
        : [...current, testCaseId]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!description.trim()) return;

    const finalTitle = title.trim() || description.trim().slice(0, 60) + "...";
    onSave({
      ...bug,
      title: finalTitle,
      description: description.trim(),
      severity,
      status,
      linkedTestCaseIds,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div className="form-modal-overlay" onClick={(event) => event.target.classList.contains("form-modal-overlay") && onClose()}>
      <div className="form-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Bug details</p>
            <h2>{bug ? "Edit bug report" : "Create new bug"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="bugTitle" className="field-label">
              Title
            </label>
            <input
              id="bugTitle"
              type="text"
              className="input-field"
              placeholder="Short, descriptive title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="bugDescription" className="field-label">
              Description
            </label>
            <textarea
              id="bugDescription"
              rows="5"
              className="textarea-field"
              placeholder="Describe what happened, where it happened, and expected behavior."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="form-grid">
            <div className="field-group">
              <label htmlFor="bugSeverity" className="field-label">
                Severity
              </label>
              <select
                id="bugSeverity"
                className="select-field"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                {severityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="bugStatus" className="field-label">
                Status
              </label>
              <select
                id="bugStatus"
                className="select-field"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Link test cases</label>
            <TestCaseSelector
              availableTestCases={testCases}
              selectedIds={linkedTestCaseIds}
              onToggle={toggleTestCase}
            />
          </div>
        </form>

        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="button" onClick={handleSubmit}>
            Save bug
          </button>
        </div>
      </div>
    </div>
  );
}
