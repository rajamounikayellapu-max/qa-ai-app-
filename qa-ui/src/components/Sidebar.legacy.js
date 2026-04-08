import { NavLink } from "react-router-dom";
import { UI_TEXT } from "../uiText";

const uiText = UI_TEXT;

const navItems = [
  { path: "/metrics", label: uiText.nav.metricsDashboard },
  { path: "/testcases", label: uiText.nav.testCaseGenerator },
  { path: "/selenium", label: uiText.nav.seleniumGenerator },
  { path: "/bug-management", label: uiText.nav.bugManagement }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-badge">QA</div>
        <div>
          <h2>{uiText.site.name}</h2>
          <p>{uiText.site.description}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
