export default function BugSearchBar({ searchTerm, onSearchChange }) {
  return (
    <div className="search-bar-card">
      <div className="search-input-wrapper">
        <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 18a8 8 0 1 1 5.29-2.21l4.95 4.95-1.42 1.42-4.95-4.95A7.95 7.95 0 0 1 10 18zm0-14a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" />
        </svg>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search bug title or description"
          className="search-input"
          aria-label="Search bugs"
        />
      </div>
    </div>
  );
}
