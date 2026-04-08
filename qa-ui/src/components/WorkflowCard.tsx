import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { WorkflowSummary } from "../services/apiService";

interface WorkflowCardProps {
  plan: WorkflowSummary;
}

export default function WorkflowCard({ plan }: WorkflowCardProps) {
  const navigate = useNavigate();
  const isRunning = plan.status === "Processing";

  return (
    <button
      type="button"
      onClick={() => navigate(`/workflow/${plan.id}`)}
      className="group w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm shadow-slate-200 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{plan.title}</h3>
          <p className="mt-2 text-sm text-slate-500">Uploaded {new Date(plan.createdAt).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={plan.status} />
      </div>
      <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
        <span>{plan.testCasesCount} test cases</span>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
        <span>{isRunning ? "Live" : "Stable"}</span>
      </div>
      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="rounded-full bg-slate-100 px-3 py-1">View workflow</span>
        <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
      </div>
    </button>
  );
}
