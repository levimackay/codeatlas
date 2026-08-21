export type StatusKind = "healthy" | "warning" | "error" | "info";

// The 6px leading-edge status dot every dense list row shares (DESIGN.md
// 4.4) so scanning a long list for anything unhealthy is a single vertical
// sweep down one column.
export function StatusDot({
  status,
  pulse = false,
  title,
}: {
  status: StatusKind;
  pulse?: boolean;
  title?: string;
}) {
  return (
    <span
      role={title ? "img" : undefined}
      aria-label={title}
      title={title}
      className={pulse ? "status-pulse" : undefined}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: `var(--status-${status})`,
        flexShrink: 0,
      }}
    />
  );
}
