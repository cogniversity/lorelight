import { CSSProperties } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 14,
  borderRadius = 4,
  style,
  className,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className || ""}`}
      style={{
        display: "block",
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="panel" style={{ padding: 22 }}>
      <Skeleton height={12} width="40%" style={{ marginBottom: 14 }} />
      <Skeleton height={20} width="70%" style={{ marginBottom: 10 }} />
      <Skeleton height={10} width="90%" style={{ marginBottom: 6 }} />
      <Skeleton height={10} width="75%" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="data-row" style={{ pointerEvents: "none" }}>
      <span className="entity-main">
        <Skeleton width={34} height={34} borderRadius={4} />
        <span style={{ flex: 1 }}>
          <Skeleton height={10} width="60%" style={{ marginBottom: 6 }} />
          <Skeleton height={8} width="40%" />
        </span>
      </span>
      <span><Skeleton height={18} width={60} borderRadius={10} /></span>
      <span><Skeleton height={8} width={50} /></span>
      <span />
    </div>
  );
}
