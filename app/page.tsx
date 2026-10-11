
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const sections = [
  { name: "Dashboard", icon: "▦" },
  { name: "New Sale", icon: "＋" },
  { name: "Inventory", icon: "▤" },
  { name: "Sales Reports", icon: "▥" },
  { name: "Suppliers", icon: "♧" },
  { name: "Purchase Orders", icon: "⇄" },
  { name: "Staff & Access", icon: "♙" },
];

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [section, setSection] = useState("Dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleAuth() {
    if (user) {
      await supabase.auth.signOut();
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }

  return (
    <main className="pos-dashboard">
      <aside className="pos-sidebar">
        <div className="pos-brand">
          <div className="pos-brand-mark">R</div>
          <div>
            <strong>Ricky POS</strong>
            <span>Business management</span>
          </div>
        </div>

        <div className="pos-menu-label">WORKSPACE</div>

        <nav className="pos-nav">
          {sections.map((item) => (
            <button
              key={item.name}
              className={`pos-nav-item ${
                section === item.name ? "active" : ""
              }`}
              onClick={() => setSection(item.name)}
            >
              <span className="pos-nav-icon">{item.icon}</span>
              <span>{item.name}</span>
              {item.name === "New Sale" && (
                <span className="pos-nav-plus">+</span>
              )}
            </button>
          ))}
        </nav>

        <div className="pos-sidebar-bottom">
          <div className="pos-status-dot" />
          <div>
            <strong>System ready</strong>
            <span>Ricky POS workspace</span>
          </div>
        </div>
      </aside>

      <section className="pos-main">
        <header className="pos-topbar">
          <div className="pos-mobile-brand">
            <div className="pos-brand-mark">R</div>
            <strong>Ricky POS</strong>
          </div>

          <div className="pos-topbar-spacer" />

          <div className="pos-user-info">
            <span className="pos-user-dot" />
            <span>{user?.email ?? "Guest account"}</span>
          </div>

          <button className="pos-auth-button" onClick={handleAuth}>
            {user ? "Sign out" : "Sign in"}
          </button>
        </header>

        <div className="pos-content">
          <div className="pos-welcome-row">
            <div>
              <p className="pos-eyebrow">YOUR BUSINESS WORKSPACE</p>
              <h1>
                {section === "Dashboard"
                  ? "Business overview"
                  : section}
              </h1>
              <p className="pos-description">
                Manage your business from one simple dashboard.
              </p>
            </div>

            <div className="pos-date-chip">
              <span className="pos-status-dot" />
              POS workspace
            </div>
          </div>

          {section === "Dashboard" ? (
            <>
              <div className="pos-summary-banner">
                <div>
                  <span className="pos-banner-label">
                    RICKY POS · OVERVIEW
                  </span>
                  <h2>Run your business with clarity.</h2>
                  <p>
                    Track sales, manage stock, and organise your
                    daily operations in one place.
                  </p>
                </div>
                <div className="pos-banner-symbol">R</div>
              </div>

              <div className="pos-section-heading">
                <div>
                  <h2>Today at a glance</h2>
                  <p>Your sales and stock summary</p>
                </div>
                  <span className="pos-demo-label">
                    Awaiting data connection
                  </span>
              </div>

              <div className="pos-stats-grid">
                <article className="pos-stat-card">
                  <div className="pos-stat-top">
                    <span>Today's sales</span>
                    <span className="pos-stat-icon green">KSh</span>
                  </div>
                  <strong>KSh 0.00</strong>
                  <p>No sales recorded yet</p>
                </article>

                <article className="pos-stat-card">
                  <div className="pos-stat-top">
                    <span>Transactions</span>
                    <span className="pos-stat-icon blue">↗</span>
                  </div>
                  <strong>0</strong>
                  <p>Today's completed sales</p>
                </article>

                <article className="pos-stat-card">
                  <div className="pos-stat-top">
                    <span>Items sold</span>
                    <span className="pos-stat-icon orange">▤</span>
                  </div>
                  <strong>0</strong>
                  <p>Units sold today</p>
                </article>

                <article className="pos-stat-card">
                  <div className="pos-stat-top">
                    <span>Stock products</span>
                    <span className="pos-stat-icon purple">□</span>
                  </div>
                  <strong>0</strong>
                  <p>Products registered</p>
                </article>
              </div>

              <div className="pos-section-heading pos-actions-heading">
                <div>
                  <h2>Business tools</h2>
                  <p>Choose what you want to work on</p>
                </div>
              </div>

              <div className="pos-tools-grid">
                {sections.slice(1).map((item, index) => {
                  const descriptions = [
                    "Record customer purchases",
                    "Manage products and stock",
                    "Review sales performance",
                    "Organise supplier details",
                    "Track incoming stock orders",
                    "Manage staff and permissions",
                  ];

                  return (
                    <button
                      key={item.name}
                      className="pos-tool-card"
                      onClick={() => setSection(item.name)}
                    >
                      <span className={`pos-tool-icon tone-${index}`}>
                        {item.icon}
                      </span>
                      <span className="pos-tool-text">
                        <strong>{item.name}</strong>
                        <span>{descriptions[index]}</span>
                      </span>
                      <span className="pos-tool-arrow">→</span>
                    </button>
                  );
                })}
              </div>

              <div className="pos-next-step">
                <div className="pos-next-icon">✓</div>
                <div>
                  <strong>Your workspace is ready for the next step</strong>
                  <p>
                    The dashboard is in place. Next, we'll connect
                    products, stock, and sales to the database.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="pos-module-panel">
              <div className="pos-module-icon">
                {sections.find((item) => item.name === section)?.icon}
              </div>
              <h2>{section}</h2>
              <p>
                This module is prepared for the next development step.
                Its records and actions have not been connected yet.
              </p>
              <button
                className="pos-primary-button"
                onClick={() => setSection("Dashboard")}
              >
                Back to dashboard
              </button>
            </div>
          )}

          <footer className="pos-footer">
            <span>© {new Date().getFullYear()} Ricky POS</span>
            <span>Built for better business management</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
