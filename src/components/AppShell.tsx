"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  GitCompare,
  Globe2,
  LayoutDashboard,
  LogOut,
  MonitorSmartphone,
  Search,
  Settings2,
  UploadCloud,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useMemo, useState, useTransition } from "react";

const nav = [
  { href: "/dashboard", label: "Executive", icon: LayoutDashboard },
  { href: "/countries", label: "Countries", icon: Globe2 },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/devices", label: "Devices", icon: MonitorSmartphone },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/admin", label: "Admin", icon: Settings2 },
  { href: "/admin/uploads", label: "Uploads", icon: UploadCloud },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [, startTransition] = useTransition();

  const links = useMemo(() => nav, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__mark">WD</div>
          <div>
            <div>Client System Reliability</div>
            <div style={{ fontSize: "0.72rem", opacity: 0.85, fontWeight: 500 }}>WDTS Operations Platform</div>
          </div>
        </div>
        <form className="search-bar" onSubmit={onSearch} style={{ background: "rgba(255,255,255,0.12)", borderColor: "transparent" }}>
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search countries, clients, tables…"
            style={{ color: "#fff" }}
          />
        </form>
        <div className="app-header__nav">
          <ThemeToggle />
          <span style={{ fontSize: "0.85rem", opacity: 0.92 }}>{user.name}</span>
          <button type="button" onClick={logout}>
            <LogOut size={15} /> Logout
          </button>
        </div>
      </header>
      <div className="app-main">
        <aside className="app-sidebar">
          {links.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
          <div style={{ marginTop: "1.2rem", padding: "0.75rem", borderRadius: 10, background: "var(--surface-2)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Activity size={14} color="var(--brand-primary)" />
              <strong style={{ fontSize: "0.82rem" }}>Live posture</strong>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.78rem", lineHeight: 1.45 }}>
              Collector-driven health across countries and clients. Role: {user.role}
            </p>
          </div>
          <Link href="/countries" style={{ marginTop: 8 }}>
            <Building2 size={16} /> Client inventory
          </Link>
        </aside>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
