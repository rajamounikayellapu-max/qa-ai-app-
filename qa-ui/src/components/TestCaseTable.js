import { useEffect, useMemo, useState } from "react";
import SearchBar from "./SearchBar";
import StatusBadge from "./StatusBadge";

const SAMPLE_TEST_CASES = [
  {
    id: 1,
    title: "Login flow",
    status: "Open",
    steps: "Open login page; enter credentials; submit",
    expectedResult: "User lands on dashboard",
  },
  {
    id: 2,
    title: "Password reset",
    status: "Waiting on Dev",
    steps: "Navigate to reset page; provide email; submit",
    expectedResult: "Password reset email sent",
  },
  {
    id: 3,
    title: "Checkout validation",
    status: "Failed",
    steps: "Add product; checkout with invalid card",
    expectedResult: "Error message shown",
  },
];

const STATUS_OPTIONS = [
  "All",
  "Open",
  "Failed",
  "Not Executed",
  "Waiting on Dev",
  "Waiting on QA",
  "Passed",
];

const DEFAULT_ROWS_PER_PAGE = 5;

function normalizeRow(testCase) {
  return {
    id: testCase.id ?? testCase.Id ?? 0,
    title: testCase.title ?? testCase.Title ?? "",
    status: testCase.status ?? testCase.Status ?? "",
    steps: testCase.steps ?? testCase.Steps ?? "",
    expectedResult: testCase.expectedResult ?? testCase.ExpectedResult ?? "",
  };
}

function truncateText(text, expanded) {
  if (expanded || text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 120)}…`;
}

function sortRows(rows, field, direction) {
  return [...rows].sort((a, b) => {
    if (field === "id") {
      return direction === "asc" ? a.id - b.id : b.id - a.id;
    }

    const left = String(a[field] ?? "").toLowerCase();
    const right = String(b[field] ?? "").toLowerCase();

    if (left < right) return direction === "asc" ? -1 : 1;
    if (left > right) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export default function TestCaseTable({ rows, onSave, onDelete, onCreateBug }) {
  const [rawSearchTerm, setRawSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [page, setPage] = useState(0);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [editingRowId, setEditingRowId] = useState(null);
  const [draftRow, setDraftRow] = useState({ title: "", status: "", steps: "", expectedResult: "" });
  const hasActions = Boolean(onSave || onDelete || onCreateBug);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(rawSearchTerm.trim());
      setPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [rawSearchTerm]);

  const allRows = useMemo(() => {
    const normalized = (rows || []).map(normalizeRow);
    return normalized.length ? normalized : SAMPLE_TEST_CASES;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return allRows.filter((testCase) => {
      const matchesStatus =
        statusFilter === "All" || !statusFilter
          ? true
          : testCase.status?.toLowerCase().includes(statusFilter.toLowerCase());
      const matchesSearch =
        !search ||
        [testCase.title, testCase.steps, testCase.expectedResult].some((value) =>
          String(value).toLowerCase().includes(search)
        );

      return matchesStatus && matchesSearch;
    });
  }, [allRows, searchTerm, statusFilter]);

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortField, sortDirection),
    [filteredRows, sortField, sortDirection]
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage));

  useEffect(() => {
    if (page >= pageCount) {
      setPage(0);
    }
  }, [page, pageCount]);

  const pageRows = useMemo(
    () => sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedRows, page, rowsPerPage]
  );

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const toggleExpanded = (id) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startEditingRow = (row) => {
    setEditingRowId(row.id);
    setDraftRow({
      title: row.title,
      status: row.status || "Open",
      steps: row.steps,
      expectedResult: row.expectedResult,
    });
  };

  const cancelEditingRow = () => {
    setEditingRowId(null);
    setDraftRow({ title: "", status: "", steps: "", expectedResult: "" });
  };

  const saveEditingRow = async (id) => {
    if (!onSave) {
      cancelEditingRow();
      return;
    }

    const payload = {
      id,
      title: draftRow.title,
      status: draftRow.status,
      steps: draftRow.steps,
      expectedResult: draftRow.expectedResult,
    };

    const result = await onSave(payload);
    if (result !== false) {
      cancelEditingRow();
    }
  };

  return (
    <div className="table-card data-grid-wrapper">
      <div className="table-header-bar">
        <div>
          <h3>Saved test cases</h3>
          <p className="table-subtitle">Search, filter, and sort your saved test cases.</p>
        </div>
      </div>

      <SearchBar
        searchTerm={rawSearchTerm}
        onSearchChange={setRawSearchTerm}
        statusFilter={statusFilter}
        onFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
      />

      <div className="results-summary">
        <span>{filteredRows.length} results</span>
        <div className="page-size-selector">
          <label htmlFor="rowsPerPage">Rows per page</label>
          <select
            id="rowsPerPage"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="no-results-card">No results found for your search and filter criteria.</div>
      ) : (
        <div className="table-scroll-wrapper">
          <table className="data-grid">
            <thead>
              <tr>
                <th onClick={() => toggleSort("id")}>
                  ID <span className="sort-indicator">{sortField === "id" ? (sortDirection === "asc" ? "▲" : "▼") : ""}</span>
                </th>
                <th onClick={() => toggleSort("title")}>
                  Title <span className="sort-indicator">{sortField === "title" ? (sortDirection === "asc" ? "▲" : "▼") : ""}</span>
                </th>
                <th onClick={() => toggleSort("status")}> 
                  Status <span className="sort-indicator">{sortField === "status" ? (sortDirection === "asc" ? "▲" : "▼") : ""}</span>
                </th>
                <th>Steps</th>
                <th>Expected Result</th>
                {hasActions && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((testCase) => {
                const expanded = expandedRows.has(testCase.id);
                return (
                  <tr key={testCase.id}>
                    <td>{testCase.id}</td>
                    {editingRowId === testCase.id ? (
                      <>
                        <td>
                          <input
                            className="line-edit-input"
                            value={draftRow.title}
                            onChange={(event) => setDraftRow((current) => ({ ...current, title: event.target.value }))}
                          />
                        </td>
                        <td>
                          <select
                            className="line-edit-input"
                            value={draftRow.status}
                            onChange={(event) => setDraftRow((current) => ({ ...current, status: event.target.value }))}
                          >
                            {STATUS_OPTIONS.filter((status) => status !== "All").map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <textarea
                            className="line-edit-textarea"
                            value={draftRow.steps}
                            onChange={(event) => setDraftRow((current) => ({ ...current, steps: event.target.value }))}
                          />
                        </td>
                        <td>
                          <textarea
                            className="line-edit-textarea"
                            value={draftRow.expectedResult}
                            onChange={(event) => setDraftRow((current) => ({ ...current, expectedResult: event.target.value }))}
                          />
                        </td>
                        <td className="data-row-actions">
                          <button
                            type="button"
                            className="secondary-button action-button"
                            onClick={() => saveEditingRow(testCase.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="secondary-button action-button"
                            onClick={cancelEditingRow}
                          >
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{testCase.title || "Untitled"}</td>
                        <td>
                          <StatusBadge status={testCase.status || "Not Executed"} />
                        </td>
                        <td>
                          <div className="cell-content">
                            <p>{truncateText(testCase.steps, expanded)}</p>
                            {testCase.steps.length > 120 && (
                              <button className="more-link" onClick={() => toggleExpanded(testCase.id)}>
                                {expanded ? "Show Less" : "Show More"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="cell-content">
                            <p>{truncateText(testCase.expectedResult, expanded)}</p>
                            {testCase.expectedResult.length > 120 && (
                              <button className="more-link" onClick={() => toggleExpanded(testCase.id)}>
                                {expanded ? "Show Less" : "Show More"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="data-row-actions">
                          {onSave && (
                            <button
                              type="button"
                              className="secondary-button action-button"
                              onClick={() => startEditingRow(testCase)}
                            >
                              Edit
                            </button>
                          )}
                          {onCreateBug && (
                            <button
                              type="button"
                              className="secondary-button action-button"
                              onClick={() => onCreateBug(testCase)}
                            >
                              Create Bug
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              className="secondary-button action-button"
                              onClick={() => onDelete(testCase)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination-bar">
        <div className="pagination-info">
          Page {page + 1} of {pageCount}
        </div>
        <div className="pagination-actions">
          <button
            className="pagination-button"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
          >
            Previous
          </button>
          <button
            className="pagination-button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(current + 1, pageCount - 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
