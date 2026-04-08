import { motion } from "framer-motion";
import { BarChart3, Clock3, Layers, Target } from "lucide-react";

interface DetailItem {
  title: string;
  description: string;
  impact: string;
  icon: typeof BarChart3;
  badge: "Risk" | "Warning" | "Suggestion";
}

interface InsightsDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const details: DetailItem[] = [
  {
    title: "Locator coverage gap",
    description: "Two test cases are missing reusable locators for checkout and login flows.",
    impact: "High impact on maintenance",
    icon: Target,
    badge: "Risk",
  },
  {
    title: "Flaky step detected",
    description: "The payment flow has a timing-sensitive selector that can fail on slower environments.",
    impact: "Potential false negatives",
    icon: Clock3,
    badge: "Warning",
  },
  {
    title: "Selector optimization",
    description: "Use XPath where appropriate for dynamic form elements to improve resilience.",
    impact: "Improves stability",
    icon: Layers,
    badge: "Suggestion",
  },
];

const badgeStyles: Record<string, string> = {
  Risk: "bg-rose-500/10 text-rose-300",
  Warning: "bg-amber-500/10 text-amber-300",
  Suggestion: "bg-violet-500/10 text-violet-300",
};

export default function InsightsDetailPanel({ isOpen, onClose }: InsightsDetailPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`${isOpen ? "block" : "hidden"} rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Insights detail</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Deep dive recommendations</h2>
          <p className="mt-2 text-slate-600">Explore why these insights matter and what to fix first for stronger automation confidence.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {details.map((detail) => {
          const Icon = detail.icon;
          return (
            <div key={detail.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-sm shadow-slate-900/20">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{detail.title}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeStyles[detail.badge]}`}>
                      {detail.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{detail.description}</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-white/90 p-4 text-sm text-slate-700 shadow-sm shadow-slate-200/50">
                <p className="font-medium text-slate-900">Impact</p>
                <p className="mt-1">{detail.impact}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
