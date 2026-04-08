import { useMemo, useState } from "react";

const severityClasses = {
  Low: "badge-severity-low",
  Medium: "badge-severity-medium",
  High: "badge-severity-high",
  Critical: "badge-severity-critical",
};

const statusClasses = {
  Open: "badge-status-open",
  "In Progress": "badge-status-in-progress",
  Closed: "badge-status-closed",
};

export default function BugCard({ bug, testCases, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const linkedCases = useMemo(
    () => testCases.filter((testCase) => bug.linkedTestCaseIds.includes(testCase.id)),
    [bug.linkedTestCaseIds, testCases]
  );

  return (
    <article className="bug-card">
      <div className="bug-card-header">
        <div>
          <h3>{bug.title}</h3>
          <div className="label-row">
            <span className={`badge ${severityClasses[bug.severity] || "badge-severity-medium"}`}>
              {bug.severity}
            </span>
            <span className={`badge ${statusClasses[bug.status] || "badge-status-open"}`}>
              {bug.status}
            </span>
          </div>
        </div>
        <div className="card-actions">
          <button className="icon-button" type="button" onClick={() => onEdit(bug)} aria-label="Edit bug">
            ✎
          </button>
          <button className="icon-button danger" type="button" onClick={() => onDelete(bug.id)} aria-label="Delete bug">
            🗑
          </button>
        </div>
      </div>

      <p className="card-description">
        {bug.description.length > 120 && !isExpanded ? `${bug.description.slice(0, 120)}...` : bug.description}
      </p>

      <div className="bug-card-footer">
        <span className="muted-text">Created {new Date(bug.createdAt).toLocaleDateString()}</span>
        <button className="secondary-button small" type="button" onClick={() => setIsExpanded((current) => !current)}>
          {isExpanded ? "Hide details" : "View details"}
        </button>
      </div>

      {isExpanded && (
        <div className="bug-details-card">
          <div className="detail-row">
            <strong>Linked test cases</strong>
            <span>{linkedCases.length}</span>
          </div>
          <ul className="linked-list">
            {linkedCases.length > 0 ? (
              linkedCases.map((testCase) => (
                <li key={testCase.id} className="linked-item">
                  <span>{testCase.title}</span>
                  <small className="muted-text">ID: {testCase.id}</small>
                </li>
              ))
            ) : (
              <li className="muted-text">No test cases linked yet.</li>
            )}
          </ul>
        </div>
      )}
    </article>
  );
}
