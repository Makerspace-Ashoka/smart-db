import { useMemo, useState } from "react";
import { api, type InventorySummaryRow, type PartTypeItemsResponse } from "../api";

interface InventoryTabProps {
  rows: InventorySummaryRow[];
  isLoading: boolean;
  onRefresh: () => void;
}

function formatQty(value: number, isInteger: boolean): string {
  if (isInteger) return Math.round(value).toString();
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export function InventoryTab({ rows, isLoading, onRefresh }: InventoryTabProps) {
  const [query, setQuery] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<PartTypeItemsResponse | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);

  async function toggleExpand(partTypeId: string): Promise<void> {
    if (expandedId === partTypeId) {
      setExpandedId(null);
      setExpandedItems(null);
      return;
    }
    setExpandedId(partTypeId);
    setExpandedItems(null);
    setExpandLoading(true);
    try {
      const items = await api.getPartTypeItems(partTypeId);
      setExpandedItems(items);
    } catch {
      setExpandedItems({ bulkStocks: [], instances: [] });
    } finally {
      setExpandLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (!showEmpty && row.bins === 0 && row.instanceCount === 0) return false;
      if (!q) return true;
      const blob = [
        row.canonicalName,
        row.categoryPath.join(" / "),
        row.unit.symbol,
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });

    const groups = new Map<string, InventorySummaryRow[]>();
    for (const row of filtered) {
      const top = row.categoryPath[0] ?? "Uncategorized";
      const list = groups.get(top) ?? [];
      list.push(row);
      groups.set(top, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, query, showEmpty]);

  const totals = useMemo(() => {
    let parts = 0;
    let bulks = 0;
    let instances = 0;
    let onHand = 0;
    for (const row of rows) {
      parts += 1;
      bulks += row.bins;
      instances += row.instanceCount;
      onHand += row.onHand;
    }
    return { parts, bulks, instances, onHand };
  }, [rows]);

  return (
    <section
      role="tabpanel"
      id="panel-inventory"
      aria-labelledby="tab-inventory"
      className="panel"
    >
      <header className="panel-title">
        <p className="eyebrow">Stock on hand</p>
        <h2>Inventory</h2>
        <p>Live view of every part type tied to your QR codes.</p>
      </header>

      <div className="metrics">
        <div className="metric">
          <span>Part types</span>
          <strong>{totals.parts}</strong>
        </div>
        <div className="metric">
          <span>Bulk bins</span>
          <strong>{totals.bulks}</strong>
        </div>
        <div className="metric">
          <span>Instances</span>
          <strong>{totals.instances}</strong>
        </div>
        <div className="metric">
          <span>Total on hand</span>
          <strong>{totals.onHand.toFixed(1)}</strong>
        </div>
      </div>

      <div className="inventory-controls">
        <input
          type="search"
          value={query}
          placeholder="Filter by name, category, or unit…"
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="inventory-toggle">
          <input
            type="checkbox"
            checked={showEmpty}
            onChange={(event) => setShowEmpty(event.target.checked)}
          />
          Show empty
        </label>
        <button type="button" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="muted-copy">No inventory entries match your filter.</p>
      ) : (
        grouped.map(([top, items]) => (
          <section key={top} className="inventory-group">
            <h3 className="inventory-group-title">
              <span>{top}</span>
              <span className="inventory-group-count">{items.length}</span>
            </h3>
            <ul className="inventory-list">
              {items.map((row) => {
                const subPath = row.categoryPath.slice(1).join(" / ");
                const isStocked = row.bins > 0 || row.instanceCount > 0;
                const isExpanded = expandedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`inventory-row ${isStocked ? "stocked" : "empty"} ${isExpanded ? "expanded" : ""}`}
                      onClick={() => void toggleExpand(row.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="inventory-row-name">
                        <strong>{row.canonicalName}</strong>
                        {subPath ? <span>{subPath}</span> : null}
                      </div>
                      <div className="inventory-row-quantity">
                        {row.countable ? (
                          <>
                            <span className="qty-value">{row.instanceCount}</span>
                            <span className="qty-unit">items</span>
                          </>
                        ) : (
                          <>
                            <span className="qty-value">
                              {formatQty(row.onHand, row.unit.isInteger)}
                            </span>
                            <span className="qty-unit">{row.unit.symbol}</span>
                          </>
                        )}
                      </div>
                    </button>
                    {isExpanded ? (
                      <div className="inventory-row-detail">
                        {expandLoading ? (
                          <p className="muted-copy">Loading...</p>
                        ) : expandedItems && (expandedItems.bulkStocks.length > 0 || expandedItems.instances.length > 0) ? (
                          <ul className="inventory-detail-list">
                            {expandedItems.bulkStocks.map((bs) => (
                              <li key={bs.id} className="inventory-detail-item">
                                <code>{bs.qrCode}</code>
                                <span>{bs.location}</span>
                                <strong>{formatQty(bs.quantity, row.unit.isInteger)} {row.unit.symbol}</strong>
                              </li>
                            ))}
                            {expandedItems.instances.map((inst) => (
                              <li key={inst.id} className="inventory-detail-item">
                                <code>{inst.qrCode}</code>
                                <span>{inst.location}</span>
                                <strong>{inst.status}</strong>
                                {inst.assignee ? <span>{inst.assignee}</span> : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted-copy">No items assigned to this part type.</p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
