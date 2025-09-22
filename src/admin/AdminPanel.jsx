import React, { useMemo, useState, useEffect } from "react";
import "./AdminPanel.css";

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    tagline: "KPIs and pipeline health",
    src: "/admin_pages/dashboard.html",
  },
  {
    id: "funnel",
    label: "Order Funnel",
    tagline: "Conversion drop-off insights",
    src: "/admin_pages/funnel.html",
  },
  {
    id: "orders",
    label: "Orders",
    tagline: "Manage fulfilment and customer info",
    src: "/admin_pages/orders.html",
  },
  {
    id: "labels",
    label: "Print Labels",
    tagline: "Generate shipping batches",
    src: "/admin_pages/labels.html",
  },
];

export default function AdminPanel({ admin, onSignOut }) {
  const [active, setActive] = useState("dashboard");

  const activeItem = useMemo(
    () => NAV_ITEMS.find((item) => item.id === active) || NAV_ITEMS[0],
    [active]
  );

  useEffect(() => {
    if (!activeItem) return;
    const previousTitle = document.title;
    document.title = `Admin | ${activeItem.label}`;
    return () => {
      document.title = previousTitle;
    };
  }, [activeItem]);

  const adminLabel = admin?.name?.trim() || admin?.email || "Admin";

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div>
          <div className="admin-nav__brand">FlipSnip Admin</div>
          <div className="admin-nav__section">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-nav__item${
                  item.id === active ? " admin-nav__item--active" : ""
                }`}
                onClick={() => setActive(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-nav__spacer" />
        <div className="admin-nav__footer">internal use only</div>
      </aside>

      <main className="admin-main">
        <div className="admin-main__header">
          <div>
            <div className="admin-main__title">{activeItem.label}</div>
            <div className="admin-main__tagline">{activeItem.tagline}</div>
          </div>
          <div className="admin-main__actions">
            <a className="admin-main__link" href="/">
              Return to app
            </a>
            <div className="admin-main__user">
              <span className="admin-main__avatar" aria-hidden="true">
                {adminLabel.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <div className="admin-main__user-name">{adminLabel}</div>
                <div className="admin-main__user-role">Administrator</div>
              </div>
              <button type="button" className="admin-main__logout" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
        <div className="admin-main__body">
          <iframe
            key={activeItem.id}
            className="admin-frame"
            title={`Admin ${activeItem.label}`}
            src={activeItem.src}
            loading="lazy"
          />
        </div>
      </main>
    </div>
  );
}
