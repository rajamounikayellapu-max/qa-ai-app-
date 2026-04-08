export default function SearchBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onFilterChange,
  statusOptions
}) {
  return (
    <div className="table-tools">
      <div className="search-field">
        <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 18a8 8 0 1 1 5.29-2.21l4.95 4.95-1.42 1.42-4.95-4.95A7.95 7.95 0 0 1 10 18zm0-14a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
        </svg>
        <input
          type="search"
          className="table-search-input"
          placeholder="Search title, steps, or expected result"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search test cases"
        />
      </div>

      <div className="filter-field">
        <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5h18v2H3V5zm4 6h10v2H7v-2zm6 6H9v2h4v-2z" />
        </svg>
        <select
          className="table-filter-select"
          value={statusFilter}
          onChange={(event) => onFilterChange(event.target.value)}
          aria-label="Filter by status"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
