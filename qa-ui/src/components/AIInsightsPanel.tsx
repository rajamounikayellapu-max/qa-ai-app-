import { motion } from "framer-motion";
import { AlertTriangle, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

export type InsightType = "risk" | "warning" | "suggestion";

export interface Insight {
  type: InsightType;
  message: string;
}

interface AIInsightsPanelProps {
  insights: Insight[];
  onViewDetails?: () => void;
}

const insightMeta: Record<InsightType, { icon: typeof Sparkles; accent: string; label: string }> = {
  risk: {
    icon: AlertTriangle,
    accent: "text-rose-300 bg-rose-500/10",
    label: "Risk",
  },
  warning: {
    icon: AlertCircle,
    accent: "text-amber-300 bg-amber-500/10",
    label: "Warning",
  },
  suggestion: {
    icon: Sparkles,
    accent: "text-violet-300 bg-violet-500/10",
    label: "Suggestion",
  },
};

export default function AIInsightsPanel({ insights, onViewDetails }: AIInsightsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="group rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950/95 p-6 shadow-lg shadow-slate-950/30 ring-1 ring-white/10"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-sky-300">AI Insights</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">Automated recommendations</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 text-sky-300 shadow-inner shadow-sky-500/10">
          <Sparkles className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {insights.map((insight) => {
          const InsightIcon = insightMeta[insight.type].icon;
          return (
            <div
              key={insight.message}
              className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-slate-900/10"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${insightMeta[insight.type].accent}`}>
                <InsightIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-slate-100">{insight.message}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {insightMeta[insight.type].label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={onViewDetails}
          className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
        >
          View Details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
