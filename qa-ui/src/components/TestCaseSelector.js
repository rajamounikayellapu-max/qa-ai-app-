import { useEffect, useMemo, useRef, useState } from "react";

export default function TestCaseSelector({ availableTestCases, selectedIds, onToggle }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTestCases = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return availableTestCases;
    return availableTestCases.filter((testCase) =>
      testCase.title.toLowerCase().includes(normalized)
    );
  }, [availableTestCases, query]);

  const selectedTestCases = useMemo(
    () => availableTestCases.filter((testCase) => selectedIds.includes(testCase.id)),
    [availableTestCases, selectedIds]
  );

  return (
    <div className="lookup-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="lookup-control"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="lookup-chips">
          {selectedTestCases.map((testCase) => (
            <span key={testCase.id} className="lookup-chip">
              {testCase.title}
              <button
                type="button"
                className="chip-remove"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(testCase.id);
                }}
                aria-label={`Remove ${testCase.title}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="search"
            className="lookup-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search test cases"
            aria-label="Search linked test cases"
          />
        </div>
        <span className="lookup-arrow">▾</span>
      </button>

      {open && (
        <div className="lookup-dropdown">
          <div className="lookup-dropdown-header">
            <span className="lookup-title">Select test cases</span>
          </div>
          <div className="lookup-results">
            {filteredTestCases.length > 0 ? (
              filteredTestCases.map((testCase) => (
                <button
                  key={testCase.id}
                  type="button"
                  className={`lookup-item ${selectedIds.includes(testCase.id) ? "selected" : ""}`}
                  onClick={() => onToggle(testCase.id)}
                >
                  <span>{testCase.title}</span>
                  {selectedIds.includes(testCase.id) && <span className="lookup-badge">Linked</span>}
                </button>
              ))
            ) : (
              <div className="lookup-empty">No matching test cases found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
