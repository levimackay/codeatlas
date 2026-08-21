import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../icons/Icon";

export interface Column<T> {
  id: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  mono?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectedId?: string | null;
  onRowClick?: (row: T) => void;
  leading?: (row: T) => ReactNode;
  rowHeight?: number;
  emptyMessage?: string;
}

// The dense, hairline-separated table every resource-listing view shares —
// DESIGN.md 4.4. No zebra striping, no cards: hover washes to
// surface-panel, click pins the row (copper wash + left rule) and this is
// the single interaction every list view in the product uses.
export function Table<T>({
  columns,
  rows,
  getRowId,
  selectedId,
  onRowClick,
  leading,
  rowHeight = 32,
  emptyMessage = "Nothing here yet.",
}: TableProps<T>) {
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.id);
    if (!column?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.id !== columnId) return { id: columnId, dir: "asc" };
      if (prev.dir === "asc") return { id: columnId, dir: "desc" };
      return null;
    });
  }

  if (rows.length === 0) {
    return (
      <div className="text-body-sm" style={{ color: "var(--text-tertiary)", padding: "var(--space-6)" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <table role="table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <colgroup>
        {leading && <col style={{ width: 28 }} />}
        {columns.map((c) => (
          <col key={c.id} style={{ width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {leading && <th scope="col" style={{ padding: 0 }} />}
          {columns.map((column) => (
            <th
              key={column.id}
              scope="col"
              style={{
                textAlign: "left",
                padding: "var(--space-2) var(--space-3)",
                borderBottom: "1px solid var(--border-hairline)",
                position: "sticky",
                top: 0,
                background: "var(--surface-content)",
              }}
            >
              {column.sortValue ? (
                <button
                  type="button"
                  onClick={() => toggleSort(column.id)}
                  className="text-label"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                  }}
                  aria-sort={sort?.id === column.id ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                >
                  {column.header}
                  {sort?.id === column.id && <Icon name={sort.dir === "asc" ? "sort-asc" : "sort-desc"} size={16} />}
                </button>
              ) : (
                <span className="text-label" style={{ color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                  {column.header}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => {
          const id = getRowId(row);
          const selected = selectedId === id;
          return (
            <tr
              key={id}
              onClick={() => onRowClick?.(row)}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              style={{ height: rowHeight, cursor: onRowClick ? "pointer" : "default" }}
              className={selected ? "table-row table-row-selected" : "table-row"}
            >
              {leading && (
                <td style={{ padding: "0 0 0 var(--space-2)", borderBottom: "1px solid var(--border-hairline)" }}>
                  {leading(row)}
                </td>
              )}
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={column.mono ? "text-data" : "text-body"}
                  style={{
                    padding: "var(--space-2) var(--space-3)",
                    borderBottom: "1px solid var(--border-hairline)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--text-secondary)",
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
