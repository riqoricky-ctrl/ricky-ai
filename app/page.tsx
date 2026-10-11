
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

type Product = {
  id: string;
  sku: string | null;
  name: string;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [section, setSection] = useState("Dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("5");

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

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("pos_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setProducts([]);
    } else {
      setProducts((data ?? []) as Product[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (section === "Inventory" && user) {
      loadProducts();
    }
  }, [section, user]);

  async function handleAuth() {
    if (user) {
      await supabase.auth.signOut();
      window.location.href = "/";
    } else {
      window.location.href = "/login";
    }
  }

  async function addProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!user) {
      setError("Please sign in before adding products.");
      return;
    }

    const numericPrice = Number(price);
    const numericQuantity = Number(quantity);
    const numericThreshold = Number(threshold);

    if (
      !name.trim() ||
      price.trim() === "" ||
      quantity.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 0 ||
      !Number.isInteger(numericThreshold) ||
      numericThreshold < 0
    ) {
      setError("Enter a product name, valid price, and whole-number stock quantities.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("pos_products").insert({
      user_id: user.id,
      name: name.trim(),
      sku: sku.trim() || null,
      selling_price: numericPrice,
      quantity: numericQuantity,
      low_stock_threshold: numericThreshold,
    });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setName("");
    setSku("");
    setPrice("");
    setQuantity("");
    setThreshold("5");
    setNotice("Product saved successfully.");
    await loadProducts();
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}" from inventory?`)) {
      return;
    }

    setError("");
    setNotice("");

    const { error } = await supabase
      .from("pos_products")
      .delete()
      .eq("id", product.id);

    if (error) {
      setError(error.message);
      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );
    setNotice("Product deleted.");
  }

  const money = (value: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(Number(value));

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
              className={`pos-nav-item ${section === item.name ? "active" : ""}`}
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
          {section === "Inventory" ? (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">PRODUCT MANAGEMENT</p>
                  <h1>Inventory</h1>
                  <p className="pos-description">
                    Add products and keep track of available stock.
                  </p>
                </div>
                <div className="pos-date-chip">
                  {products.length} products
                </div>
              </div>

              {!user && (
                <div className="pos-next-step">
                  Please sign in to view and manage your inventory.
                  <button className="pos-primary-button" onClick={handleAuth}>
                    Sign in
                  </button>
                </div>
              )}

              {user && (
                <>
                  <div className="pos-stats-grid">
                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Total products</div>
                      <strong>{products.length}</strong>
                      <p>Registered products</p>
                    </article>
                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Units in stock</div>
                      <strong>
                        {products.reduce((sum, p) => sum + p.quantity, 0)}
                      </strong>
                      <p>Across all products</p>
                    </article>
                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Low stock</div>
                      <strong>
                        {products.filter(
                          (p) => p.quantity <= p.low_stock_threshold
                        ).length}
                      </strong>
                      <p>Products needing attention</p>
                    </article>
                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Stock value</div>
                      <strong>
                        {money(
                          products.reduce(
                            (sum, p) =>
                              sum + Number(p.selling_price) * p.quantity,
                            0
                          )
                        )}
                      </strong>
                      <p>At selling prices, not cost prices</p>
                    </article>
                  </div>

                  <div className="pos-inventory-layout">
                    <section className="pos-inventory-form">
                      <h2>Add a product</h2>
                      <p className="pos-description">
                        Product information and opening stock
                      </p>

                      <form onSubmit={addProduct}>
                        <label htmlFor="product-name">Product name *</label>
                        <input
                          id="product-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Milk"
                          required
                        />

                        <label htmlFor="product-sku">SKU / Product code</label>
                        <input
                          id="product-sku"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="e.g. MILK001"
                        />

                        <label htmlFor="product-price">
                          Selling price (KSh) *
                        </label>
                        <input
                          id="product-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="e.g. 50"
                          required
                        />

                        <label htmlFor="product-quantity">
                          Opening quantity *
                        </label>
                        <input
                          id="product-quantity"
                          type="number"
                          min="0"
                          step="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          placeholder="e.g. 20"
                          required
                        />

                        <label htmlFor="product-threshold">
                          Low-stock alert at
                        </label>
                        <input
                          id="product-threshold"
                          type="number"
                          min="0"
                          step="1"
                          value={threshold}
                          onChange={(e) => setThreshold(e.target.value)}
                          required
                        />

                        <button
                          className="pos-primary-button pos-submit"
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save product"}
                        </button>
                      </form>
                    </section>

                    <section className="pos-inventory-list">
                      <div className="pos-section-heading">
                        <div>
                          <h2>Product list</h2>
                          <p>Your saved inventory</p>
                        </div>
                        <button
                          className="pos-auth-button"
                          onClick={loadProducts}
                          disabled={loading}
                        >
                          {loading ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      {error && (
                        <div className="pos-message pos-error">{error}</div>
                      )}
                      {notice && (
                        <div className="pos-message pos-success">{notice}</div>
                      )}

                      {loading ? (
                        <p className="pos-empty">Loading products...</p>
                      ) : products.length === 0 ? (
                        <p className="pos-empty">
                          No products yet. Add your first product using the
                          form.
                        </p>
                      ) : (
                        <div className="pos-product-list">
                          {products.map((product) => (
                            <article
                              className="pos-product-row"
                              key={product.id}
                            >
                              <div className="pos-product-symbol">▤</div>
                              <div className="pos-product-info">
                                <strong>{product.name}</strong>
                                <span>
                                  {product.sku || "No product code"} ·{" "}
                                  {money(product.selling_price)}
                                </span>
                                <span
                                  className={
                                    product.quantity <=
                                    product.low_stock_threshold
                                      ? "pos-stock-low"
                                      : "pos-stock-ok"
                                  }
                                >
                                  {product.quantity} in stock
                                  {product.quantity <=
                                    product.low_stock_threshold &&
                                    " · Low stock"}
                                </span>
                              </div>
                              <button
                                className="pos-delete-button"
                                onClick={() => deleteProduct(product)}
                                aria-label={`Delete ${product.name}`}
                              >
                                Delete
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          ) : section === "Dashboard" ? (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">YOUR BUSINESS WORKSPACE</p>
                  <h1>Business overview</h1>
                  <p className="pos-description">
                    Manage your business from one simple dashboard.
                  </p>
                </div>
                <div className="pos-date-chip">
                  <span className="pos-status-dot" />
                  POS workspace
                </div>
              </div>

              <div className="pos-summary-banner">
                <div>
                  <span className="pos-banner-label">
                    RICKY POS · OVERVIEW
                  </span>
                  <h2>Run your business with clarity.</h2>
                  <p>
                    Track sales, manage stock, and organise your daily
                    operations in one place.
                  </p>
                </div>
                <div className="pos-banner-symbol">R</div>
              </div>

              <div className="pos-section-heading">
                <div>
                  <h2>Today at a glance</h2>
                  <p>Your sales and stock summary</p>
                </div>
              </div>

              <div className="pos-stats-grid">
                {[
                  ["Today's sales", "KSh 0.00"],
                  ["Transactions", "0"],
                  ["Items sold", "0"],
                  ["Stock products", "—"],
                ].map(([label, value]) => (
                  <article className="pos-stat-card" key={label}>
                    <div className="pos-stat-top">{label}</div>
                    <strong>{value}</strong>
                    <p>Sales reporting will be connected next</p>
                  </article>
                ))}
              </div>

              <div className="pos-section-heading">
                <div>
                  <h2>Business tools</h2>
                  <p>Choose what you want to work on</p>
                </div>
              </div>

              <div className="pos-tools-grid">
                {sections.slice(1).map((item) => (
                  <button
                    key={item.name}
                    className="pos-tool-card"
                    onClick={() => setSection(item.name)}
                  >
                    <span className="pos-tool-icon">{item.icon}</span>
                    <span className="pos-tool-text">
                      <strong>{item.name}</strong>
                      <span>
                        {item.name === "Inventory"
                          ? "Manage products and stock"
                          : "Open this business module"}
                      </span>
                    </span>
                    <span className="pos-tool-arrow">→</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="pos-module-panel">
              <div className="pos-module-icon">
                {sections.find((item) => item.name === section)?.icon}
              </div>
              <h2>{section}</h2>
              <p>
                This module is awaiting its implementation. Your inventory
                is available now.
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
