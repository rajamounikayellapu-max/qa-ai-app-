import { useLocation, useNavigate } from "react-router-dom";

const actions = [
  { label: "Upload a new test plan", path: "/upload" },
  { label: "Preview generated project", path: "/projects" },
  { label: "Run execution pipeline", path: "/execution" },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/40">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">Quick actions</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Navigate your workflow</h2>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {actions.map((action) => {
          const isActive = location.pathname === action.path;
          return (
            <button
              key={action.path}
              type="button"
              onClick={() => navigate(action.path)}
              className={`w-full rounded-3xl border px-4 py-3 text-left text-sm font-semibold transition duration-200 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
