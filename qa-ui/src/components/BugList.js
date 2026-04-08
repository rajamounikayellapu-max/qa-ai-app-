import BugCard from "./BugCard";

export default function BugList({ bugs, testCases, onEdit, onDelete }) {
  if (!bugs.length) {
    return (
      <div className="empty-state-card">
        <h3>No bugs found</h3>
        <p>Try changing your search or filters, or create a new bug to begin tracking issues.</p>
      </div>
    );
  }

  return (
    <div className="card-grid">
      {bugs.map((bug) => (
        <BugCard key={bug.id} bug={bug} testCases={testCases} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
