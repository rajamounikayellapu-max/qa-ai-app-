import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  BarChart3, 
  Upload, 
  FileText, 
  Target, 
  Code, 
  Play, 
  Download, 
  Menu,
  X,
  CheckSquare
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Test Cases", href: "/testcases", icon: FileText },
  { name: "Locators", href: "/locators", icon: Target },
  { name: "Code", href: "/code", icon: Code },
  { name: "Code Review", href: "/code-review", icon: CheckSquare },
  { name: "Execution", href: "/execution", icon: Play },
  { name: "Download", href: "/download", icon: Download },
];

export default function Sidebar() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <SidebarContent location={location} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:w-64 lg:bg-white lg:shadow-lg">
        <SidebarContent location={location} />
      </div>

      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-slate-700"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
          <div className="flex flex-1 items-center">
            <h1 className="text-xl font-bold text-slate-900">AI QA Automation</h1>
          </div>
        </div>
      </div>
    </>
  );
}

function SidebarContent({ location, onClose }: { location: any; onClose?: () => void }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 py-8">
      <div className="flex h-16 shrink-0 items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">AI QA Automation</h1>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== "/dashboard" && location.pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition ${
                        isActive
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      }`}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  );
}
