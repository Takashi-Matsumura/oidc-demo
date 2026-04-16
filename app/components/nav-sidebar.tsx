"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    group: "OIDC 概要",
    items: [{ href: "/", label: "ホーム" }],
  },
  {
    group: "Phase 1: OIDC Client",
    items: [
      { href: "/client", label: "ダッシュボード" },
      { href: "/client/login", label: "ログイン" },
      { href: "/client/callback", label: "コールバック" },
      { href: "/client/tokens", label: "トークン検証" },
      { href: "/client/userinfo", label: "UserInfo" },
      { href: "/client/flow-log", label: "フローログ" },
    ],
  },
];

export default function NavSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-64 shrink-0 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-lg font-bold tracking-tight">OIDC Demo</h1>
        <p className="text-xs text-zinc-500 mt-1">OpenID Connect 学習用</p>
      </div>
      <div className="p-2">
        {navItems.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {group.group}
            </p>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-zinc-200 text-zinc-900 font-medium dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
