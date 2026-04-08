interface Step {
  name: string;
  status: "Completed" | "Running" | "Failed" | "Pending";
}

interface StepperProps {
  steps: Step[];
}

const statusMeta = {
  Completed: { badge: "bg-emerald-500 text-white", dot: "bg-emerald-500" },
  Running: { badge: "bg-sky-500 text-white", dot: "bg-sky-500" },
  Failed: { badge: "bg-rose-500 text-white", dot: "bg-rose-500" },
  Pending: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-300" },
};

export default function Stepper({ steps }: StepperProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {steps.map((step, index) => {
          const meta = statusMeta[step.status];
          return (
            <div key={step.name} className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.dot} text-white`}>
                {index + 1}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{step.name}</p>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                  {step.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative h-1 bg-slate-200">
        <div
          className="absolute left-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-indigo-500"
          style={{ width: `${Math.round((steps.filter((step) => step.status === "Completed").length / steps.length) * 100)}%` }}
        />
      </div>
    </div>
  );
}
