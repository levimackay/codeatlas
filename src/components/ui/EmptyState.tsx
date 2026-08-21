import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "var(--space-8) var(--space-6)",
        maxWidth: 420,
      }}
    >
      <div className="text-panel-title">{title}</div>
      {description && (
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)", margin: 0 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
