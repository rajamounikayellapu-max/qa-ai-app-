import { ReactNode } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChevronUp, ChevronDown } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  trend: number;
  status: "good" | "warning" | "risk";
  icon: ReactNode;
  sparklineData: number[];
  lastUpdated?: string;
}

const statusAccent = {
  good: {
    ring: "ring-emerald-400/20",
    dot: "bg-emerald-400/10 text-emerald-300",
    line: "#34d399",
  },
  warning: {
    ring: "ring-amber-400/20",
    dot: "bg-amber-400/10 text-amber-300",
    line: "#f59e0b",
  },
  risk: {
    ring: "ring-rose-400/20",
    dot: "bg-rose-400/10 text-rose-300",
    line: "#fb7185",
  },
};

export default function KpiCard({
  title,
  value,
  trend,
  status,
  icon,
  sparklineData,
  lastUpdated,
}: KpiCardProps) {
  const isPositive = trend >= 0;
  const badgeColor = isPositive ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300";
  const formattedTrend = `${isPositive ? "+" : ""}${trend}%`;
  const accent = statusAccent[status];

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/95 px-5 py-5 shadow-lg shadow-slate-950/30 ${accent.ring}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-slate-200 shadow-inner shadow-slate-900/20">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
          {isPositive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {formattedTrend}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${accent.dot}`}>{status}</span>
      </div>

      <div className="mt-5 h-24 overflow-hidden rounded-3xl bg-slate-900/80 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparklineData.map((value) => ({ value }))}>
            <XAxis dataKey="value" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Line type="monotone" dataKey="value" stroke={accent.line} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 hidden min-w-[190px] rounded-2xl border border-white/10 bg-slate-950/95 p-3 text-xs text-slate-300 shadow-xl shadow-slate-950/40 group-hover:block">
        <p className="font-semibold text-slate-100">Last updated</p>
        <p className="mt-1">{lastUpdated ?? "Just now"}</p>
        <p className="mt-2">Trend: {formattedTrend} from last run</p>
      </div>
    </div>
  );
}
