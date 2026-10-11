
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  user_id?: string;
  sku: string | null;
  name: string;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
};

type ReceiptItem = {
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type Receipt = {
  id: string;
  receipt_number: string;
  total: number;
  payment_method: string;
  created_at: string;
  items: ReceiptItem[];
};

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [searchTerm, setSearchTerm] = useState("");

  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);

  const money = (value: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(Number(value) || 0);

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
    if (!user) return;

    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("pos_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setProducts([]);
    } else {
      setProducts((data ?? []) as Product[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (user && (section === "Inventory" || section === "New Sale")) {
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
      setError("Please sign in first.");
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
      setError("Enter valid product details and whole-number quantities.");
      return;
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from("pos_products")
      .insert({
        user_id: user.id,
        name: name.trim(),
        sku: sku.trim() || null,
        selling_price: numericPrice,
        quantity: numericQuantity,
        low_stock_threshold: numericThreshold,
      });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
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

  function changeCart(productId: string, change: number) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setCart((current) => {
      const nextQuantity = Math.max(
        0,
        Math.min(
          product.quantity,
          (current[productId] ?? 0) + change
        )
      );

      const next = { ...current };

      if (nextQuantity === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }

      return next;
    });

    setError("");
  }

  const cartTotal = Object.entries(cart).reduce(
    (total, [productId, qty]) => {
      const product = products.find((item) => item.id === productId);
      return total + (product ? Number(product.selling_price) * qty : 0);
    },
    0
  );

  const cartCount = Object.values(cart).reduce(
    (total, qty) => total + qty,
    0
  );

  async function completeSale() {
    if (!user) {
      setError("Please sign in before completing a sale.");
      return;
    }

    const items = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));

    if (items.length === 0) {
      setError("Add products to your cart first.");
      return;
    }

    setCheckoutBusy(true);
    setError("");
    setNotice("");

    const { data: saleId, error: checkoutError } =
      await supabase.rpc("pos_checkout", {
        p_items: items,
        p_payment_method: paymentMethod,
      });

    if (checkoutError || !saleId) {
      setError(
        checkoutError?.message ?? "Checkout failed. Please try again."
      );
      setCheckoutBusy(false);
      return;
    }

    const { data: sale, error: saleError } = await supabase
      .from("pos_sales")
      .select("id, receipt_number, total, payment_method, created_at")
      .eq("id", saleId)
      .single();

    const { data: saleItems, error: itemsError } = await supabase
      .from("pos_sale_items")
      .select("product_name, unit_price, quantity, line_total")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: true });

    setCheckoutBusy(false);

    if (saleError || itemsError || !sale) {
      setCart({});
      await loadProducts();
      setError(
        "The sale was recorded, but the receipt could not be loaded. Please check your Supabase sales tables."
      );
      return;
    }

    setLastReceipt({
      ...sale,
      total: Number(sale.total),
      items: (saleItems ?? []).map((item: any) => ({
        product_name: item.product_name,
        unit_price: Number(item.unit_price),
        quantity: Number(item.quantity),
        line_total: Number(item.line_total),
      })),
    });

    setCart({});
    setNotice("Sale completed successfully. Stock has been updated.");
    await loadProducts();
  }

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.trim().toLowerCase();

    return (
      product.name.toLowerCase().includes(term) ||
      (product.sku ?? "").toLowerCase().includes(term)
    );
  });

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
              onClick={() => {
                setSection(item.name);
                setError("");
                setNotice("");
              }}
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
          {error && (
            <div className="pos-message pos-error">{error}</div>
          )}

          {notice && (
            <div className="pos-message pos-success">{notice}</div>
          )}

          {section === "Dashboard" && (
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
                    Track sales, manage stock, and organise daily operations.
                  </p>
                </div>
                <div className="pos-banner-symbol">R</div>
              </div>

              <div className="pos-stats-grid">
                <article className="pos-stat-card">
                  <div className="pos-stat-top">Products in stock</div>
                  <strong>{user ? products.length : "—"}</strong>
                  <p>Sign in and open Inventory to load products</p>
                </article>
                <article className="pos-stat-card">
                  <div className="pos-stat-top">Units available</div>
                  <strong>
                    {products.reduce((sum, item) => sum + item.quantity, 0)}
                  </strong>
                  <p>Total units in your inventory</p>
                </article>
                <article className="pos-stat-card">
                  <div className="pos-stat-top">Low-stock products</div>
                  <strong>
                    {
                      products.filter(
                        (item) =>
                          item.quantity <= item.low_stock_threshold
                      ).length
                    }
                  </strong>
                  <p>Products at or below their alert level</p>
                </article>
                <article className="pos-stat-card">
                  <div className="pos-stat-top">Current cart</div>
                  <strong>{cartCount}</strong>
                  <p>Items in your unfinished sale</p>
                </article>
              </div>

              <div className="pos-section-heading">
                <div>
                  <h2>Business tools</h2>
                  <p>Choose a module to get started</p>
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
                        {item.name === "New Sale"
                          ? "Sell products and print receipts"
                          : item.name === "Inventory"
                            ? "Manage products and stock"
                            : "Business module"}
                      </span>
                    </span>
                    <span className="pos-tool-arrow">→</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {section === "Inventory" && (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">PRODUCT MANAGEMENT</p>
                  <h1>Inventory</h1>
                  <p className="pos-description">
                    Add products and keep track of your stock.
                  </p>
                </div>
                <div className="pos-date-chip">
                  {products.length} products
                </div>
              </div>

              {!user ? (
                <div className="pos-next-step">
                  Please sign in to manage inventory.
                  <button
                    className="pos-primary-button"
                    onClick={handleAuth}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <>
                  <div className="pos-inventory-layout">
                    <section className="pos-inventory-form">
                      <h2>Add a product</h2>
                      <p className="pos-description">
                        Enter the product and opening stock.
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
                          <p>Search your saved inventory</p>
                        </div>
                        <button
                          className="pos-auth-button"
                          onClick={loadProducts}
                          disabled={loading}
                        >
                          {loading ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      <input
                        className="pos-search-input"
                        placeholder="Search name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search inventory"
                      />

                      {loading ? (
                        <p className="pos-empty">Loading products...</p>
                      ) : filteredProducts.length === 0 ? (
                        <p className="pos-empty">
                          No matching products found.
                        </p>
                      ) : (
                        <div className="pos-product-list">
                          {filteredProducts.map((product) => (
                            <article
                              className="pos-product-row"
                              key={product.id}
                            >
                              <div className="pos-product-symbol">▤</div>
                              <div className="pos-product-info">
                                <strong>{product.name}</strong>
                                <span>
                                  {product.sku || "No product code"}
                                </span>
                                <span>
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
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          )}

          {section === "New Sale" && (
            <>
              <div className="pos-welcome-row">
                <div>
                  <p className="pos-eyebrow">POINT OF SALE</p>
                  <h1>New sale</h1>
                  <p className="pos-description">
                    Add products, choose payment, and complete checkout.
                  </p>
                </div>
                <div className="pos-date-chip">
                  {products.length} products
                </div>
              </div>

              {!user ? (
                <div className="pos-next-step">
                  Please sign in before making a sale.
                  <button
                    className="pos-primary-button"
                    onClick={handleAuth}
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <>
                  {lastReceipt && (
                    <section className="pos-edit-panel">
                      <div className="pos-section-heading">
                        <div>
                          <p className="pos-eyebrow">SALE COMPLETED</p>
                          <h2>Receipt</h2>
                          <p>{lastReceipt.receipt_number}</p>
                          <p>
                            {new Date(
                              lastReceipt.created_at
                            ).toLocaleString("en-KE")}
                          </p>
                        </div>
                        <button
                          className="pos-auth-button"
                          onClick={() => window.print()}
                        >
                          Print receipt
                        </button>
                      </div>

                      {lastReceipt.items.map((item, index) => (
                        <div className="pos-product-row" key={index}>
                          <div className="pos-product-info">
                            <strong>
                              {item.product_name} × {item.quantity}
                            </strong>
                            <span>{money(item.unit_price)} each</span>
                          </div>
                          <strong>{money(item.line_total)}</strong>
                        </div>
                      ))}

                      <div className="pos-section-heading">
                        <h2>Total paid</h2>
                        <h2>{money(lastReceipt.total)}</h2>
                      </div>
                      <p className="pos-description">
                        Payment method: {lastReceipt.payment_method.toUpperCase()}
                      </p>
                    </section>
                  )}

                  <div className="pos-inventory-layout">
                    <section className="pos-inventory-list">
                      <div className="pos-section-heading">
                        <div>
                          <h2>Available products</h2>
                          <p>Products with stock can be added to your sale.</p>
                        </div>
                        <button
                          className="pos-auth-button"
                          onClick={loadProducts}
                          disabled={loading}
                        >
                          {loading ? "Loading..." : "Refresh"}
                        </button>
                      </div>

                      <input
                        className="pos-search-input"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search sale products"
                      />

                      {loading ? (
                        <p className="pos-empty">Loading products...</p>
                      ) : (
                        <div className="pos-product-list">
                          {filteredProducts
                            .filter((product) => product.quantity > 0)
                            .map((product) => (
                              <article
                                className="pos-product-row"
                                key={product.id}
                              >
                                <div className="pos-product-symbol">▤</div>
                                <div className="pos-product-info">
                                  <strong>{product.name}</strong>
                                  <span>
                                    {product.quantity} in stock
                                  </span>
                                  <span>
                                    {money(Number(product.selling_price))}
                                  </span>
                                  <button
                                    type="button"
                                    className="pos-primary-button"
                                    disabled={
                                      (cart[product.id] ?? 0) >=
                                      product.quantity
                                    }
                                    onClick={() =>
                                      changeCart(product.id, 1)
                                    }
                                  >
                                    Add to cart
                                  </button>
                                </div>
                              </article>
                            ))}
                        </div>
                      )}
                    </section>

                    <section className="pos-inventory-form">
                      <h2>Current sale</h2>
                      <p className="pos-description">
                        {cartCount} item(s) in cart
                      </p>

                      {Object.keys(cart).length === 0 ? (
                        <p className="pos-empty">
                          Your cart is empty. Add products to begin.
                        </p>
                      ) : (
                        <div className="pos-cart-items">
                          {Object.entries(cart).map(([productId, qty]) => {
                            const product = products.find(
                              (item) => item.id === productId
                            );
                            if (!product) return null;

                            return (
                              <div className="pos-cart-row" key={productId}>
                                <div className="pos-product-info">
                                  <strong>{product.name}</strong>
                                  <span>
                                    {money(Number(product.selling_price))} each
                                  </span>
                                </div>
                                <div className="pos-quantity-controls">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      changeCart(productId, -1)
                                    }
                                    aria-label={`Remove one ${product.name}`}
                                  >
                                    −
                                  </button>
                                  <strong>{qty}</strong>
                                  <button
                                    type="button"
                                    disabled={qty >= product.quantity}
                                    onClick={() =>
                                      changeCart(productId, 1)
                                    }
                                    aria-label={`Add one ${product.name}`}
                                  >
                                    +
                                  </button>
                                </div>
                                <strong>
                                  {money(
                                    Number(product.selling_price) * qty
                                  )}
                                </strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pos-section-heading">
                        <strong>Sale total</strong>
                        <strong>{money(cartTotal)}</strong>
                      </div>

                      <label htmlFor="payment-method">
                        Payment method
                      </label>
                      <select
                        id="payment-method"
                        className="pos-filter-select"
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value)
                        }
                      >
                        <option value="cash">Cash</option>
                        <option value="mpesa">M-Pesa</option>
                        <option value="card">Card</option>
                      </select>

                      <button
                        type="button"
                        className="pos-primary-button pos-submit"
                        onClick={completeSale}
                        disabled={
                          checkoutBusy || Object.keys(cart).length === 0
                        }
                      >
                        {checkoutBusy
                          ? "Processing..."
                          : "Complete sale"}
                      </button>

                      <p className="pos-description">
                        Stock is deducted only after checkout succeeds.
                      </p>
                    </section>
                  </div>
                </>
              )}
            </>
          )}

          {section !== "Dashboard" &&
            section !== "Inventory" &&
            section !== "New Sale" && (
              <div className="pos-module-panel">
                <div className="pos-module-icon">
                  {sections.find((item) => item.name === section)?.icon}
                </div>
                <h2>{section}</h2>
                <p>
                  This module will be connected in a future Ricky POS step.
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
