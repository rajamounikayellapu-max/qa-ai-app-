export default function FilterPanel({
  severityFilter,
  statusFilter,
  severityOptions,
  statusOptions,
  onSeverityChange,
  onStatusChange,
  onClearFilters,
}) {
  return (
    <div className="filter-panel-card">
      <div className="filter-group">
        <label className="field-label" htmlFor="severityFilter">
          Severity
        </label>
        <select
          id="severityFilter"
          className="select-field"
          value={severityFilter}
          onChange={(event) => onSeverityChange(event.target.value)}
        >
          {severityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="field-label" htmlFor="statusFilter">
          Status
        </label>
        <select
          id="statusFilter"
          className="select-field"
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <button className="secondary-button small" type="button" onClick={onClearFilters}>
        Reset filters
      </button>
    </div>
  );
}
