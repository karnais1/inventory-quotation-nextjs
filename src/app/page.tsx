"use client";

import React, { useMemo, useState } from "react";

type ItemType = "MATERIAL" | "SERVICE";

interface CatalogItem {
  id: string;
  name: string;
  type: ItemType;
  category: string;
  unitPrice: number;
  stockQuantity: number;
  bulkDiscountRate: number;
  taxRate: number;
}

interface QuoteLineItem {
  item: CatalogItem;
  quantity: number;
  lineTotal: number;
  note: string;
}

const INITIAL_CATALOG: CatalogItem[] = [
  {
    id: "MAT-101",
    name: "Standard Cement Bag",
    type: "MATERIAL",
    category: "Building",
    unitPrice: 420,
    stockQuantity: 50,
    bulkDiscountRate: 0.05,
    taxRate: 0,
  },
  {
    id: "MAT-102",
    name: "PVC Conduit Pipe",
    type: "MATERIAL",
    category: "Electrical",
    unitPrice: 180,
    stockQuantity: 30,
    bulkDiscountRate: 0.08,
    taxRate: 0,
  },
  {
    id: "SRV-201",
    name: "Site Inspection & Layout",
    type: "SERVICE",
    category: "Consulting",
    unitPrice: 1500,
    stockQuantity: 999999,
    bulkDiscountRate: 0,
    taxRate: 0.18,
  },
];

function calculatePricing(item: CatalogItem, quantity: number) {
  if (item.type === "MATERIAL") {
    const raw = item.unitPrice * quantity;
    if (quantity >= 10 && item.bulkDiscountRate > 0) {
      return {
        total: Number((raw * (1 - item.bulkDiscountRate)).toFixed(2)),
        note: `${Math.round(item.bulkDiscountRate * 100)}% bulk discount applied (qty ≥ 10)`,
      };
    }
    return { total: Number(raw.toFixed(2)), note: "Standard unit price" };
  }

  return {
    total: Number((item.unitPrice * quantity * (1 + item.taxRate)).toFixed(2)),
    note: `Includes ${Math.round(item.taxRate * 100)}% tax`,
  };
}

export default function DashboardPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [quote, setQuote] = useState<QuoteLineItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_CATALOG[0].id);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"ALL" | ItemType>("ALL");

  // Add Item Form
  const [itemType, setItemType] = useState<ItemType>("MATERIAL");
  const [newId, setNewId] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newStockOrTax, setNewStockOrTax] = useState<string>("");
  const [newDiscount, setNewDiscount] = useState<string>("0.05");

  // Quote & Restock Qty
  const [actionQty, setActionQty] = useState<string>("12");

  // Notification Banner
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const selectedItem = useMemo(
    () => catalog.find((c) => c.id === selectedId) ?? null,
    [catalog, selectedId]
  );

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesType = filterType === "ALL" || item.type === filterType;
      const matchesQuery =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [catalog, searchQuery, filterType]);

  const totalStockUnits = useMemo(
    () =>
      catalog
        .filter((i) => i.type === "MATERIAL")
        .reduce((sum, i) => sum + i.stockQuantity, 0),
    [catalog]
  );

  const grandTotal = useMemo(
    () => Number(quote.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2)),
    [quote]
  );

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const cleanId = newId.trim().toUpperCase();
    const cleanName = newName.trim();
    const cleanCat = newCategory.trim();
    const price = Number(newPrice);

    if (!cleanId || !cleanName || !cleanCat) {
      setBanner({ kind: "error", text: "Please fill in Item ID, Name, and Category." });
      return;
    }
    if (catalog.some((i) => i.id.toUpperCase() === cleanId)) {
      setBanner({ kind: "error", text: `Duplicate Item ID "${cleanId}".` });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setBanner({ kind: "error", text: "Unit price must be a valid non-negative number." });
      return;
    }

    if (itemType === "MATERIAL") {
      const stock = Number(newStockOrTax);
      const disc = newDiscount.trim() === "" ? 0 : Number(newDiscount);
      if (!Number.isInteger(stock) || stock < 0) {
        setBanner({ kind: "error", text: "Initial stock must be a whole number ≥ 0." });
        return;
      }
      if (!Number.isFinite(disc) || disc < 0 || disc > 0.5) {
        setBanner({ kind: "error", text: "Bulk discount must be between 0 and 0.5." });
        return;
      }
      const created: CatalogItem = {
        id: cleanId,
        name: cleanName,
        type: "MATERIAL",
        category: cleanCat,
        unitPrice: price,
        stockQuantity: stock,
        bulkDiscountRate: disc,
        taxRate: 0,
      };
      setCatalog((prev) => [...prev, created]);
      setSelectedId(created.id);
    } else {
      const tax = newStockOrTax.trim() === "" ? 0.18 : Number(newStockOrTax);
      if (!Number.isFinite(tax) || tax < 0 || tax > 0.5) {
        setBanner({ kind: "error", text: "Tax rate must be between 0 and 0.5 (e.g., 0.18)." });
        return;
      }
      const created: CatalogItem = {
        id: cleanId,
        name: cleanName,
        type: "SERVICE",
        category: cleanCat,
        unitPrice: price,
        stockQuantity: 999999,
        bulkDiscountRate: 0,
        taxRate: tax,
      };
      setCatalog((prev) => [...prev, created]);
      setSelectedId(created.id);
    }

    setNewId("");
    setNewName("");
    setNewCategory("");
    setNewPrice("");
    setNewStockOrTax("");
    setNewDiscount("0.05");
    setBanner({ kind: "success", text: `Added ${cleanId} (${cleanName}) to catalog.` });
  }

  function handleAddToQuote() {
    if (!selectedItem) {
      setBanner({ kind: "error", text: "Select an item from the catalog table first." });
      return;
    }
    const qty = Number(actionQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setBanner({ kind: "error", text: "Enter a valid positive whole number for Quantity." });
      return;
    }
    if (selectedItem.type === "MATERIAL" && qty > selectedItem.stockQuantity) {
      setBanner({
        kind: "error",
        text: `Insufficient stock for ${selectedItem.name} (Available: ${selectedItem.stockQuantity}, Requested: ${qty}).`,
      });
      return;
    }

    const pricing = calculatePricing(selectedItem, qty);
    setQuote((prev) => [
      ...prev,
      { item: { ...selectedItem }, quantity: qty, lineTotal: pricing.total, note: pricing.note },
    ]);

    if (selectedItem.type === "MATERIAL") {
      setCatalog((prev) =>
        prev.map((c) =>
          c.id === selectedItem.id ? { ...c, stockQuantity: c.stockQuantity - qty } : c
        )
      );
    }

    setBanner({
      kind: "success",
      text: `Added ${qty} × ${selectedItem.name} (₹${pricing.total.toFixed(2)}) to quotation.`,
    });
  }

  function handleRestock() {
    if (!selectedItem) {
      setBanner({ kind: "error", text: "Select a material item first." });
      return;
    }
    if (selectedItem.type === "SERVICE") {
      setBanner({ kind: "error", text: "Service items do not use physical stock." });
      return;
    }
    const addQty = Number(actionQty);
    if (!Number.isInteger(addQty) || addQty <= 0) {
      setBanner({ kind: "error", text: "Enter a positive whole number in Quantity to restock." });
      return;
    }
    setCatalog((prev) =>
      prev.map((c) =>
        c.id === selectedItem.id ? { ...c, stockQuantity: c.stockQuantity + addQty } : c
      )
    );
    setBanner({
      kind: "success",
      text: `Restocked +${addQty} units for ${selectedItem.name} (${selectedItem.id}).`,
    });
  }

  function handleExportCsv() {
    if (quote.length === 0) {
      setBanner({ kind: "error", text: "Cannot export an empty quotation." });
      return;
    }
    const lines = [
      "ItemID,ItemName,Type,Category,Quantity,LineTotal",
      ...quote.map(
        (l) =>
          `${l.item.id},"${l.item.name.replaceAll('"', '""')}",${l.item.type},"${l.item.category.replaceAll('"', '""')}",${l.quantity},${l.lineTotal.toFixed(2)}`
      ),
      `TOTAL,,,,,${grandTotal.toFixed(2)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quotes_export.csv";
    a.click();
    URL.revokeObjectURL(url);
    setBanner({ kind: "success", text: "Exported quotes_export.csv." });
  }

  return (
    <div className="dash-shell">
      {/* Left Sidebar */}
      <aside className="dash-sidebar">
        <div>
          <div className="brand">
            <div className="brand-badge">IQ</div>
            <div>
              <p className="brand-title">Inventory &amp; Quote</p>
              <p className="brand-sub">Management Dashboard</p>
            </div>
          </div>

          <div className="nav-list">
            <button
              type="button"
              className={`nav-item ${filterType === "ALL" ? "active" : ""}`}
              onClick={() => setFilterType("ALL")}
            >
              All Catalog Items ({catalog.length})
            </button>
            <button
              type="button"
              className={`nav-item ${filterType === "MATERIAL" ? "active" : ""}`}
              onClick={() => setFilterType("MATERIAL")}
            >
              Materials ({catalog.filter((i) => i.type === "MATERIAL").length})
            </button>
            <button
              type="button"
              className={`nav-item ${filterType === "SERVICE" ? "active" : ""}`}
              onClick={() => setFilterType("SERVICE")}
            >
              Services ({catalog.filter((i) => i.type === "SERVICE").length})
            </button>
          </div>
        </div>

        <div className="sidebar-foot">
          <strong style={{ color: "#e2e8f0" }}>Pricing Rules</strong>
          <br />• Materials ≥ 10 qty: automatic bulk discount
          <br />• Services: automatic tax calculation
          <br />• Export: one-click CSV report
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="dash-main">
        <header className="dash-topbar">
          <h1 className="topbar-title">Modular Inventory &amp; Quotation Dashboard</h1>
          <div className="topbar-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setQuote([]);
                setBanner({ kind: "success", text: "Quotation cleared." });
              }}
            >
              Clear Quote
            </button>
            <button type="button" className="btn btn-primary" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        </header>

        <div className="dash-content">
          {/* 4 KPI Cards */}
          <section className="kpi-grid">
            <div className="kpi-card">
              <p className="kpi-label">Catalog SKUs</p>
              <p className="kpi-val">{catalog.length}</p>
              <p className="kpi-hint">Materials &amp; services</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Available Stock</p>
              <p className="kpi-val">{totalStockUnits}</p>
              <p className="kpi-hint">Total material units</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Quote Line Items</p>
              <p className="kpi-val">{quote.length}</p>
              <p className="kpi-hint">Entries in active bill</p>
            </div>
            <div className="kpi-card">
              <p className="kpi-label">Quotation Total</p>
              <p className="kpi-val emerald">₹{grandTotal.toFixed(2)}</p>
              <p className="kpi-hint">Incl. bulk discounts &amp; tax</p>
            </div>
          </section>

          {/* Status Banner */}
          {banner && (
            <div className={`alert ${banner.kind}`}>
              <span>{banner.text}</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 10px", fontSize: "12px" }}
                onClick={() => setBanner(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Workspace: Left (Table + Form) & Right (Quotation Summary) */}
          <div className="workspace-grid">
            <div className="left-stack">
              {/* Catalog Table Card */}
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2 className="card-title">Catalog Items</h2>
                    <p className="card-sub">
                      Select any row to add it to the quotation or restock inventory.
                    </p>
                  </div>
                  <div style={{ width: "230px" }}>
                    <input
                      type="text"
                      className="input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, name, category..."
                    />
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th className="right">Unit Price (₹)</th>
                        <th className="right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCatalog.map((item) => (
                        <tr
                          key={item.id}
                          className={item.id === selectedId ? "selected" : ""}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td className="mono" style={{ color: "#6ee7b7", fontWeight: 700 }}>
                            {item.id}
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.name}</td>
                          <td>
                            <span
                              className={`pill ${
                                item.type === "MATERIAL" ? "pill-mat" : "pill-srv"
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td style={{ color: "#cbd5e1" }}>{item.category}</td>
                          <td className="mono right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="mono right">
                            {item.type === "SERVICE" ? "—" : item.stockQuantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Selected Item Action Strip */}
                <div className="action-strip">
                  <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
                    Selected:{" "}
                    <strong style={{ color: "#fff" }}>
                      {selectedItem ? `${selectedItem.id} · ${selectedItem.name}` : "None"}
                    </strong>
                  </div>

                  <div className="action-controls">
                    <input
                      type="number"
                      min={1}
                      className="input qty-box"
                      value={actionQty}
                      onChange={(e) => setActionQty(e.target.value)}
                      aria-label="Quantity"
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddToQuote}>
                      Add to Quote
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleRestock}>
                      Restock
                    </button>
                  </div>
                </div>
              </section>

              {/* Add Item Form Card */}
              <section className="card">
                <div className="card-head">
                  <div>
                    <h2 className="card-title">Add New Catalog Item</h2>
                    <p className="card-sub">
                      Register a physical material or billable service item.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAddItem} className="form-grid">
                  <div className="field">
                    <label>Type</label>
                    <select
                      className="select"
                      value={itemType}
                      onChange={(e) => setItemType(e.target.value as ItemType)}
                    >
                      <option value="MATERIAL">MATERIAL</option>
                      <option value="SERVICE">SERVICE</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Item ID</label>
                    <input
                      type="text"
                      className="input"
                      value={newId}
                      onChange={(e) => setNewId(e.target.value)}
                      placeholder={itemType === "MATERIAL" ? "MAT-103" : "SRV-202"}
                    />
                  </div>

                  <div className="field">
                    <label>Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Copper Cable Roll"
                    />
                  </div>

                  <div className="field">
                    <label>Category</label>
                    <input
                      type="text"
                      className="input"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Electrical"
                    />
                  </div>

                  <div className="field">
                    <label>Unit Price / Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="450"
                    />
                  </div>

                  {itemType === "MATERIAL" ? (
                    <>
                      <div className="field">
                        <label>Initial Stock Qty</label>
                        <input
                          type="number"
                          min="0"
                          className="input"
                          value={newStockOrTax}
                          onChange={(e) => setNewStockOrTax(e.target.value)}
                          placeholder="40"
                        />
                      </div>
                      <div className="field span-2">
                        <label>Bulk Discount Rate (0.05 = 5% off for qty ≥ 10)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="0.5"
                          className="input"
                          value={newDiscount}
                          onChange={(e) => setNewDiscount(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="field span-2">
                      <label>Tax Rate (0.18 = 18%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="0.5"
                        className="input"
                        value={newStockOrTax}
                        onChange={(e) => setNewStockOrTax(e.target.value)}
                        placeholder="0.18"
                      />
                    </div>
                  )}

                  <div className="align-end">
                    <button type="submit" className="btn btn-blue" style={{ width: "100%" }}>
                      Add to Catalog
                    </button>
                  </div>
                </form>
              </section>
            </div>

            {/* Right: Sticky Quotation Panel */}
            <aside className="card quote-sticky">
              <div className="card-head">
                <div>
                  <h2 className="card-title">Current Quotation</h2>
                  <p className="card-sub">Live itemized customer estimate</p>
                </div>
              </div>

              {quote.length === 0 ? (
                <div className="quote-empty">
                  No items in quotation yet. Select an item on the left, enter quantity, and click{" "}
                  <strong style={{ color: "#e2e8f0" }}>Add to Quote</strong>.
                </div>
              ) : (
                <div className="quote-list">
                  {quote.map((line, idx) => (
                    <div key={`${line.item.id}-${idx}`} className="quote-item">
                      <div className="quote-item-top">
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px" }}>
                            {line.item.name}
                          </div>
                          <div className="mono" style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {line.item.id} · Qty: {line.quantity} × ₹{line.item.unitPrice}
                          </div>
                        </div>
                        <div className="mono" style={{ fontWeight: 700, color: "#34d399" }}>
                          ₹{line.lineTotal.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "6px" }}>
                        {line.note}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="quote-total-box">
                <span style={{ fontSize: "14px", color: "#cbd5e1", fontWeight: 600 }}>
                  Grand Total
                </span>
                <span className="mono" style={{ fontSize: "24px", fontWeight: 800 }}>
                  ₹{grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="quote-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleExportCsv}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuote([]);
                    setBanner({ kind: "success", text: "Quotation cleared." });
                  }}
                >
                  Clear
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}