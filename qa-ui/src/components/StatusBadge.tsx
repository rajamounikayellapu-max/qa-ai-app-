interface StatusBadgeProps {
  status: "Processing" | "Completed" | "Failed";
}

const badgeStyles = {
  Processing: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Failed: "bg-rose-100 text-rose-700",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[status]}`}>
      {status}
    </span>
  );
}
