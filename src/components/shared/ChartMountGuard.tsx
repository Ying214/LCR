"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type ChartMountGuardProps = {
  className?: string;
  fallback?: ReactNode;
  forceRender?: boolean;
  children: ReactNode;
};

export function ChartMountGuard({ className, fallback, forceRender = false, children }: ChartMountGuardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    let frameId: number | null = null;

    const evaluateSize = () => {
      const node = containerRef.current;
      if (!node) {
        setReady(false);
        return;
      }

      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      const hasSize = rect.width > 0 && rect.height > 0;
      const isVisible = style.display !== "none" && style.visibility !== "hidden";
      const nextReady = hasSize && isVisible;

      if (!nextReady) {
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
        }
        setReady(false);
        return;
      }

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        setReady(true);
        frameId = null;
      });
    };

    const observer = new ResizeObserver(() => {
      evaluateSize();
    });

    observer.observe(element);
    evaluateSize();

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("w-full min-w-0", className)}>
      {forceRender || ready ? children : (fallback ?? <div className="h-full w-full" />)}
    </div>
  );
}
