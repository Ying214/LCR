"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartMountGuardProps = {
  className?: string;
  fallback?: ReactNode;
  children: ReactNode;
};

export function ChartMountGuard({ className, fallback, children }: ChartMountGuardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;
      setReady(width > 0 && height > 0);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={cn("w-full min-w-0", className)}>
      {ready ? children : (fallback ?? <div className="h-full w-full" />)}
    </div>
  );
}

