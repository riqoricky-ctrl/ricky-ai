
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

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editThreshold, setEditThreshold] = useState("5");

  const [stockChange, setStockChange] =
    useState<Record<string, string>>({});

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

  async function addProduct(
    event: React.FormEvent<HTMLFormElement>
  ) {
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
      setError(
        "Enter a product name, valid price, and whole-number stock quantities."
      );
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

  function startEditing(product: Product) {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSku(product.sku ?? "");
    setEditPrice(String(product.selling_price));
    setEditQuantity(String(product.quantity));
    setEditThreshold(String(product.low_stock_threshold));
    setError("");
    setNotice("");
  }

  async function saveProductChanges(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingProduct) return;

    const numericPrice = Number(editPrice);
    const numericQuantity = Number(editQuantity);
    const numericThreshold = Number(editThreshold);

    if (
      !editName.trim() ||
      editPrice.trim() === "" ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      editQuantity.trim() === "" ||
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 0 ||
      !Number.isInteger(numericThreshold) ||
      numericThreshold < 0
    ) {
      setError(
        "Enter valid details and non-negative whole-number stock quantities."
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    const { error } = await supabase
      .from("pos_products")
      .update({
        name: editName.trim(),
        sku: editSku.trim() || null,
        selling_price: numericPrice,
        quantity: numericQuantity,
        low_stock_threshold: numericThreshold,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingProduct.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingProduct(null);
    setNotice("Product updated successfully.");
    await loadProducts();
  }

  async function adjustStock(
    product: Product,
    direction: number
  ) {
    const amountText = stockChange[product.id] ?? "1";
    const amount = Number(amountText);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a whole number greater than zero.");
      setNotice("");
      return;
    }

    const nextQuantity = product.quantity + direction * amount;

    if (nextQuantity < 0) {
      setError("Stock cannot go below zero.");
      setNotice("");
      return;
    }

    setError("");
    setNotice("");

    const { error } = await supabase
      .from("pos_products")
      .update({
        quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setError(error.message);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, quantity: nextQuantity }
          : item
      )
    );

    setNotice(`Stock updated for ${product.name}.`);
  }

  async function deleteProduct(product: Product) {
    if (
      !window.confirm(
        `Delete "${product.name}" from inventory?`
      )
    ) {
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

    if (editingProduct?.id === product.id) {
      setEditingProduct(null);
    }

    setNotice("Product deleted.");
  }

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.trim().toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      (product.sku ?? "").toLowerCase().includes(term);

    const isLow =
      product.quantity <= product.low_stock_threshold;

    const matchesFilter =
      stockFilter === "all" ||
      (stockFilter === "low" && isLow) ||
      (stockFilter === "available" && !isLow);

    return matchesSearch && matchesFilter;
  });

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
          {section === "Inventory" ? (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">PRODUCT MANAGEMENT</p>
                  <h1>Inventory</h1>
                  <p className="pos-description">
                    Add products, edit details, and manage stock.
                  </p>
                </div>
                <div className="pos-date-chip">
                  {products.length} products
                </div>
              </div>

              {!user && (
                <div className="pos-next-step">
                  Please sign in to manage your inventory.
                  <button
                    className="pos-primary-button"
                    onClick={handleAuth}
                  >
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
                        {products.reduce(
                          (sum, p) => sum + p.quantity,
                          0
                        )}
                      </strong>
                      <p>Across all products</p>
                    </article>

                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Low stock</div>
                      <strong>
                        {
                          products.filter(
                            (p) =>
                              p.quantity <= p.low_stock_threshold
                          ).length
                        }
                      </strong>
                      <p>Products needing attention</p>
                    </article>

                    <article className="pos-stat-card">
                      <div className="pos-stat-top">Stock value</div>
                      <strong>
                        {money(
                          products.reduce(
                            (sum, p) =>
                              sum +
                              Number(p.selling_price) * p.quantity,
                            0
                          )
                        )}
                      </strong>
                      <p>At selling prices</p>
                    </article>
                  </div>

                  <div className="pos-inventory-layout">
                    <section className="pos-inventory-form">
                      <h2>Add a product</h2>
                      <p className="pos-description">
                        Enter product details and opening stock.
                      </p>

                      <form onSubmit={addProduct}>
                        <label htmlFor="product-name">
                          Product name *
                        </label>
                        <input
                          id="product-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Milk"
                          required
                        />

                        <label htmlFor="product-sku">
                          SKU / Product code
                        </label>
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
                          onChange={(e) =>
                            setQuantity(e.target.value)
                          }
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
                          onChange={(e) =>
                            setThreshold(e.target.value)
                          }
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
                          <p>Search and manage saved inventory</p>
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
                        <div className="pos-message pos-error">
                          {error}
                        </div>
                      )}

                      {notice && (
                        <div className="pos-message pos-success">
                          {notice}
                        </div>
                      )}

                      <div className="pos-inventory-controls">
                        <input
                          className="pos-search-input"
                          aria-label="Search products"
                          placeholder="Search name or SKU..."
                          value={searchTerm}
                          onChange={(e) =>
                            setSearchTerm(e.target.value)
                          }
                        />

                        <select
                          className="pos-filter-select"
                          aria-label="Filter stock"
                          value={stockFilter}
                          onChange={(e) =>
                            setStockFilter(e.target.value)
                          }
                        >
                          <option value="all">All products</option>
                          <option value="low">Low stock</option>
                          <option value="available">
                            Above low-stock level
                          </option>
                        </select>
                      </div>

                      {loading ? (
                        <p className="pos-empty">
                          Loading products...
                        </p>
                      ) : products.length === 0 ? (
                        <p className="pos-empty">
                          No products yet. Add your first product.
                        </p>
                      ) : filteredProducts.length === 0 ? (
                        <p className="pos-empty">
                          No products match your search or filter.
                        </p>
                      ) : (
                        <div className="pos-product-list">
                          {filteredProducts.map((product) => (
                            <article
                              className="pos-product-row"
                              key={product.id}
                            >
                              <div className="pos-product-symbol">
                                ▤
                              </div>

                              <div className="pos-product-info">
                                <strong>{product.name}</strong>

                                <span>
                                  {product.sku || "No product code"} ·{" "}
                                  {money(Number(product.selling_price))}
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
                                    product.low_stock_threshold
                                    ? " · Low stock"
                                    : ""}
                                </span>

                                <div className="pos-stock-adjust">
                                  <label
                                    htmlFor={`stock-${product.id}`}
                                  >
                                    Adjust by
                                  </label>

                                  <input
                                    id={`stock-${product.id}`}
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                      stockChange[product.id] ?? "1"
                                    }
                                    onChange={(e) =>
                                      setStockChange((current) => ({
                                        ...current,
                                        [product.id]: e.target.value,
                                      }))
                                    }
                                  />

                                  <button
                                    type="button"
                                    className="pos-stock-button"
                                    disabled={saving}
                                    onClick={() =>
                                      adjustStock(product, -1)
                                    }
                                  >
                                    − Remove
                                  </button>

                                  <button
                                    type="button"
                                    className="pos-stock-button"
                                    disabled={saving}
                                    onClick={() =>
                                      adjustStock(product, 1)
                                    }
                                  >
                                    + Add
                                  </button>
                                </div>

                                <div className="pos-product-actions">
                                  <button
                                    type="button"
                                    className="pos-edit-button"
                                    onClick={() =>
                                      startEditing(product)
                                    }
                                  >
                                    Edit details
                                  </button>

                                  <button
                                    type="button"
                                    className="pos-delete-button"
                                    onClick={() =>
                                      deleteProduct(product)
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {editingProduct && (
                    <section className="pos-edit-panel">
                      <div className="pos-section-heading">
                        <div>
                          <h2>Edit product</h2>
                          <p>
                            Updating {editingProduct.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="pos-auth-button"
                          onClick={() => setEditingProduct(null)}
                        >
                          Cancel
                        </button>
                      </div>

                      <form
                        className="pos-edit-grid"
                        onSubmit={saveProductChanges}
                      >
                        <div>
                          <label htmlFor="edit-name">
                            Product name *
                          </label>
                          <input
                            id="edit-name"
                            value={editName}
                            onChange={(e) =>
                              setEditName(e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-sku">
                            SKU / Product code
                          </label>
                          <input
                            id="edit-sku"
                            value={editSku}
                            onChange={(e) =>
                              setEditSku(e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-price">
                            Selling price (KSh) *
                          </label>
                          <input
                            id="edit-price"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) =>
                              setEditPrice(e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-quantity">
                            Current quantity *
                          </label>
                          <input
                            id="edit-quantity"
                            type="number"
                            min="0"
                            step="1"
                            value={editQuantity}
                            onChange={(e) =>
                              setEditQuantity(e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="edit-threshold">
                            Low-stock alert at
                          </label>
                          <input
                            id="edit-threshold"
                            type="number"
                            min="0"
                            step="1"
                            value={editThreshold}
                            onChange={(e) =>
                              setEditThreshold(e.target.value)
                            }
                            required
                          />
                        </div>

                        <button
                          className="pos-primary-button pos-submit"
                          type="submit"
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save changes"}
                        </button>
                      </form>
                    </section>
                  )}
                </>
              )}
            </>
          ) : section === "Dashboard" ? (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">
                    YOUR BUSINESS WORKSPACE
                  </p>
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
                    <span className="pos-tool-icon">
                      {item.icon}
                    </span>
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
                This module is awaiting its implementation. Your
                inventory is available now.
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
