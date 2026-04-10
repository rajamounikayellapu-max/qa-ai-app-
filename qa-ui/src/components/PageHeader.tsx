import type { ReactNode } from "react";

interface PageHeaderProps {
  label: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export default function PageHeader({ label, title, description, actions }: PageHeaderProps) {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.28em] text-indigo-600">{label}</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-3 text-slate-600">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </header>
  );
}
