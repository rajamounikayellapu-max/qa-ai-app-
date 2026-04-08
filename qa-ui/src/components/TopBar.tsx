import { Bell, User, Brain } from "lucide-react";

export default function TopBar() {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex flex-1 items-center">
          <h1 className="text-xl font-bold text-slate-900 lg:hidden">AI QA Automation</h1>
        </div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* AI Insights Badge */}
          <button
            type="button"
            className="relative rounded-full bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100"
          >
            <Brain className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">3</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative rounded-full bg-white p-1.5 text-slate-400 hover:text-slate-500"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">2</span>
          </button>

          {/* Profile dropdown */}
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <button
              type="button"
              className="flex items-center gap-x-4 text-sm font-semibold leading-6 text-slate-900 hover:text-indigo-600"
            >
              <User className="h-8 w-8 rounded-full bg-slate-100 p-1" />
              <span className="sr-only">Your profile</span>
              <span aria-hidden="true">John Doe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}