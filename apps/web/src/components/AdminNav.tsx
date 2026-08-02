import { NavLink } from "react-router-dom";

const items = [
  { to: "/admin", label: "Табло", end: true },
  { to: "/admin/venues", label: "Зали" },
  { to: "/admin/events", label: "Събития" },
  { to: "/admin/orders", label: "Поръчки" },
  { to: "/admin/scanner", label: "Сканиране" },
  { to: "/admin/admins", label: "Администратори" },
];

export function AdminNav() {
  return (
    <nav
      className="flex gap-1 mb-6 border-b pb-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"
      style={{ borderColor: "var(--color-outline-variant)" }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="px-4 py-2 rounded-m3-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
          style={({ isActive }) => ({
            color: isActive ? "var(--color-brand-on)" : "var(--color-text)",
            backgroundColor: isActive ? "var(--color-brand)" : "transparent",
          })}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
