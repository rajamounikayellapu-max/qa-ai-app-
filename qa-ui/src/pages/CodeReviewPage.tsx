import React from 'react';
import { CheckCircle2, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const reviewItems = [
  { title: 'Clarity', detail: 'Code is easy to understand and follow.', icon: FileText },
  { title: 'Stability', detail: 'Assertions and waits are defined clearly.', icon: ShieldCheck },
  { title: 'Maintainability', detail: 'Reusable selectors and modular structure.', icon: Sparkles },
];

const CodeReviewPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Code Review</h1>
          <p className="mt-2 text-sm text-slate-600">Review generated automation scripts before running them.</p>
        </div>
        <button
          onClick={() => navigate('/code')}
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          Back to Preview
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {reviewItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Icon size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm text-slate-500">{item.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-900">
          <CheckCircle2 size={24} />
          <div>
            <h2 className="text-xl font-semibold">Overall review score</h2>
            <p className="text-sm text-slate-500">Your generated script is ready for validation.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-950 p-6 text-white">
            <p className="text-3xl font-semibold">92%</p>
            <p className="mt-2 text-sm text-slate-300">Quality score</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <p className="text-3xl font-semibold text-slate-900">3</p>
            <p className="mt-2 text-sm text-slate-500">Issues found</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-6">
            <p className="text-3xl font-semibold text-slate-900">2 mins</p>
            <p className="mt-2 text-sm text-slate-500">Review time estimate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeReviewPage;
