import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import BugForm from "../components/BugForm";
import BugList from "../components/BugList";
import BugSearchBar from "../components/BugSearchBar";
import FilterPanel from "../components/FilterPanel";

const STORAGE_KEY = "bugs";
const testCaseOptions = [
  { id: "tc-001", title: "Login flow" },
  { id: "tc-002", title: "Password reset" },
  { id: "tc-003", title: "Checkout validation" },
  { id: "tc-004", title: "Mobile checkout" },
];

const initialBugs = [
  {
    id: "bug-001",
    title: "Login button unresponsive",
    description:
      "Login button does not respond to the first click in Chrome. Users must click twice before the form submits.",
    severity: "High",
    status: "Open",
    createdAt: "2026-03-15T10:24:00.000Z",
    linkedTestCaseIds: ["tc-001"],
  },
  {
    id: "bug-002",
    title: "Checkout total excludes tax",
    description:
      "The order summary does not include sales tax when a discount code is applied. Total is shown incorrectly during checkout.",
    severity: "Critical",
    status: "In Progress",
    createdAt: "2026-03-20T09:12:00.000Z",
    linkedTestCaseIds: ["tc-003"],
  },
];

const severityOptions = ["All", "Low", "Medium", "High", "Critical"];
const statusOptions = ["All", "Open", "In Progress", "Closed"];

function makeId() {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `bug-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function BugFormatterPage() {
  const [bugs, setBugs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedBug, setSelectedBug] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const location = useLocation();

  const saveBugs = (updatedBugs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedBugs));
    window.dispatchEvent(new Event("qa-storage-updated"));
    setBugs(updatedBugs);
  };

  useEffect(() => {
    const loadStoredBugs = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBugs(JSON.parse(stored));
        return;
      }
      setBugs(initialBugs);
    };

    loadStoredBugs();

    const handleStorageUpdate = () => {
      loadStoredBugs();
    };

    window.addEventListener("storage", handleStorageUpdate);
    window.addEventListener("qa-storage-updated", handleStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageUpdate);
      window.removeEventListener("qa-storage-updated", handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
      const cleanState = {
        ...window.history.state,
        usr: {
          ...window.history.state?.usr,
          successMessage: undefined,
        },
      };
      window.history.replaceState(cleanState, "");
    }
  }, [location.state]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      const searchMatch = debouncedSearch
        ? [bug.title, bug.description].some((field) =>
            field.toLowerCase().includes(debouncedSearch.toLowerCase())
          )
        : true;
      const severityMatch = severityFilter === "All" || bug.severity === severityFilter;
      const statusMatch = statusFilter === "All" || bug.status === statusFilter;
      return searchMatch && severityMatch && statusMatch;
    });
  }, [bugs, debouncedSearch, severityFilter, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: bugs.length,
      open: bugs.filter((bug) => bug.status === "Open").length,
      inProgress: bugs.filter((bug) => bug.status === "In Progress").length,
      closed: bugs.filter((bug) => bug.status === "Closed").length,
    };
  }, [bugs]);

  const openNewBugForm = () => {
    setSelectedBug(null);
    setIsFormOpen(true);
  };

  const handleEditBug = (bug) => {
    setSelectedBug(bug);
    setIsFormOpen(true);
  };

  const handleDeleteBug = (bugId) => {
    const confirmed = window.confirm("Delete this bug? This cannot be undone.");
    if (!confirmed) return;
    saveBugs(bugs.filter((bug) => bug.id !== bugId));
  };

  const handleSaveBug = (bug) => {
    if (bug.id) {
      saveBugs(
        bugs.map((existing) => (existing.id === bug.id ? { ...existing, ...bug } : existing))
      );
    } else {
      saveBugs([
        {
          ...bug,
          id: makeId(),
          createdAt: new Date().toISOString(),
        },
        ...bugs,
      ]);
    }
    setIsFormOpen(false);
    setSelectedBug(null);
  };

  const clearFilters = () => {
    setSeverityFilter("All");
    setStatusFilter("All");
  };

  return (
    <div className="page-container bug-page-container">
      <div className="page-header">
        <div>
          <p className="page-eyebrow">Bug management</p>
          <h1>Bug management</h1>
          <p className="page-description">
            Capture, triage, and link bugs to test cases in a polished issue tracker.
          </p>
        </div>
        <button className="primary-button" onClick={openNewBugForm}>
          New bug
        </button>
      </div>

      {successMessage && (
        <div className="page-alert success-text">{successMessage}</div>
      )}

      <div
        className="assistant-stats compact-bug-summary"
        style={{
          display: 'flex',
          gap: '1.25rem',
          margin: '0.5rem auto 0.5rem auto',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '520px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          padding: '0.7rem 0.5rem',
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.04)'
        }}
      >
        <div className="assistant-card-stat small-card" style={{ minWidth: 90, textAlign: 'center', padding: '0.3rem 0' }}>
          <strong>📝 Total issues</strong>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.total}</div>
        </div>
        <div className="assistant-card-stat small-card" style={{ minWidth: 90, textAlign: 'center', padding: '0.3rem 0' }}>
          <strong>🟢 Open</strong>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.open}</div>
        </div>
        <div className="assistant-card-stat small-card" style={{ minWidth: 90, textAlign: 'center', padding: '0.3rem 0' }}>
          <strong>🟡 In progress</strong>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.inProgress}</div>
        </div>
        <div className="assistant-card-stat small-card" style={{ minWidth: 90, textAlign: 'center', padding: '0.3rem 0' }}>
          <strong>⚪ Closed</strong>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.closed}</div>
        </div>
      </div>

      <div className="tool-panel" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
        <BugSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <FilterPanel
          severityFilter={severityFilter}
          statusFilter={statusFilter}
          severityOptions={severityOptions}
          statusOptions={statusOptions}
          onSeverityChange={setSeverityFilter}
          onStatusChange={setStatusFilter}
          onClearFilters={clearFilters}
        />
      </div>

      <BugList bugs={filteredBugs} testCases={testCaseOptions} onEdit={handleEditBug} onDelete={handleDeleteBug} />

      <BugForm
        key={selectedBug?.id ?? "new-bug"}
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedBug(null);
        }}
        onSave={handleSaveBug}
        bug={selectedBug}
        testCases={testCaseOptions}
      />
    </div>
  );
}
