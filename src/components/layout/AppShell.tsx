"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Database,
  Menu,
  PlusSquare,
  Settings2,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard-compare",
    label: "量測分析 Dashboard",
    description: "比較多組 dataset 的平均量測結果",
    icon: BarChart3,
    matchPrefixes: ["/dashboard-compare"],
    excludePrefixes: [],
  },
  {
    href: "/measurements/new",
    label: "新增量測資料",
    description: "手動輸入量測資料並寫入資料庫",
    icon: PlusSquare,
    matchPrefixes: ["/measurements/new"],
    excludePrefixes: [],
  },
  {
    href: "/measurements",
    label: "量測資料管理",
    description: "以 dataset 分組管理與維護量測資料",
    icon: Database,
    matchPrefixes: ["/measurements"],
    excludePrefixes: ["/measurements/new"],
  },
  {
    href: "/baselines",
    label: "Baseline 管理",
    description: "建立與維護 baseline 參考檔",
    icon: Target,
    matchPrefixes: ["/baselines"],
    excludePrefixes: [],
  },
  {
    href: "/settings",
    label: "系統設定",
    description: "控制顯示模式與 OCR 準確率記錄開關",
    icon: Settings2,
    matchPrefixes: ["/settings"],
    excludePrefixes: [],
  },
];

type AppShellProps = {
  children: ReactNode;
};

function isPrefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isActivePath(pathname: string, prefixes: string[], excludePrefixes: string[]): boolean {
  const included = prefixes.some((prefix) => isPrefixMatch(pathname, prefix));
  const excluded = excludePrefixes.some((prefix) => isPrefixMatch(pathname, prefix));
  return included && !excluded;
}

type NavigationListProps = {
  pathname: string;
  onNavigate?: () => void;
  tone?: "dark" | "light";
};

function NavigationList({ pathname, onNavigate, tone = "dark" }: NavigationListProps) {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.matchPrefixes, item.excludePrefixes);
        const Icon = item.icon as LucideIcon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "block rounded-xl border px-3 py-3 transition-all duration-200",
              tone === "dark"
                ? active
                  ? "border-sky-300/90 bg-sky-400/15 text-white shadow-[0_0_0_1px_rgba(186,230,253,0.35)]"
                  : "border-slate-700/80 bg-slate-900/60 text-slate-100 hover:border-slate-500 hover:bg-slate-800/70"
                : active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                  tone === "dark"
                    ? active
                      ? "border-sky-200/70 bg-sky-200/20 text-sky-100"
                      : "border-slate-600 bg-slate-800 text-slate-200"
                    : active
                      ? "border-slate-200/80 bg-white/10 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p
                  className={cn(
                    "mt-1 text-xs",
                    tone === "dark"
                      ? active
                        ? "text-sky-100/90"
                        : "text-slate-300/80"
                      : active
                        ? "text-slate-200"
                        : "text-slate-500",
                  )}
                >
                  {item.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentSection = useMemo(
    () =>
      navItems.find((item) => isActivePath(pathname, item.matchPrefixes, item.excludePrefixes)) ??
      navItems[0],
    [pathname],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-900 bg-slate-950 text-slate-100 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-5 py-5">
            <h1 className="text-xl font-bold leading-snug text-slate-50">石墨晶舟量測數據顯示與分析系統</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              請由左側導覽切換 Dashboard、資料輸入、資料管理與 Baseline 管理。
            </p>
          </div>
          <div className="flex-1 px-4 py-4">
            <NavigationList pathname={pathname} tone="dark" />
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <div className="pr-4">
                <p className="text-sm font-semibold text-slate-900">{currentSection.label}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{currentSection.description}</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="開啟導覽選單"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </header>

          <main className="flex-1 px-3 py-6 sm:px-4 lg:px-3 xl:px-4">{children}</main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="h-full w-[82%] max-w-[320px] bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">石墨晶舟量測數據顯示與分析系統</p>
                <p className="mt-1 text-xs text-slate-500">請選擇要前往的功能頁面</p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setMobileOpen(false)}
                aria-label="關閉導覽選單"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavigationList pathname={pathname} tone="light" onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
