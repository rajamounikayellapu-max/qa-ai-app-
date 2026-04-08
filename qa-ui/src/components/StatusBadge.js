const STATUS_STYLES = {
  Open: "badge badge-blue",
  Failed: "badge badge-red",
  "Not Executed": "badge badge-gray",
  "Waiting on Dev": "badge badge-orange",
  "Waiting on QA": "badge badge-orange",
  Passed: "badge badge-green",
};

export default function StatusBadge({ status }) {
  const normalized = status?.trim() || "Unknown";
  const className = STATUS_STYLES[normalized] || "badge badge-gray";

  return <span className={className}>{normalized}</span>;
}
