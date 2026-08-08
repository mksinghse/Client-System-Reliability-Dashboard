"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@wdts.com");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Unable to sign in");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div style={{ textAlign: "center" }}>
          <div className="brand-lockup">
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255,255,255,0.15)",
                display: "inline-grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              WD
            </span>
            Walker Digital Table Systems
          </div>
          <h1 className="page-title" style={{ fontSize: "clamp(1.85rem,5vw,2.35rem)" }}>
            Client System Reliability Dashboard
          </h1>
          <p className="page-sub" style={{ margin: "0.75rem auto 0" }}>
            One secure portal for global client system reliability, hardware health, inventory, diagnostics, and comparison.
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }} className="stack">
          <div className="field">
            <label htmlFor="email">Work account</label>
            <select id="email" value={email} onChange={(e) => setEmail(e.target.value)}>
              <option value="admin@wdts.com">admin@wdts.com (Admin)</option>
              <option value="ops@wdts.com">ops@wdts.com (Operator)</option>
            </select>
          </div>
          {error ? (
            <div style={{ background: "#fef3f2", border: "1px solid #fecdca", color: "#912018", padding: "0.7rem 0.85rem", borderRadius: 10, fontSize: "0.85rem" }}>
              {error}
            </div>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%", minHeight: 52 }}>
            {pending ? "Signing in…" : "Sign in with SSO"}
          </button>
        </form>

        <ul className="stack-sm" style={{ marginTop: "1.4rem", paddingTop: "1rem", borderTop: "1px solid var(--line-2)", listStyle: "none" }}>
          <li style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "0.88rem" }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: "#e8f6f8", color: "var(--brand-primary)", display: "inline-grid", placeItems: "center" }}>
              <ShieldCheck size={16} />
            </span>
            <span>
              <strong>Secure connection</strong>
              <span className="muted"> · Collector uploads & audit trails protected</span>
            </span>
          </li>
        </ul>

        <p className="muted" style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.82rem" }}>
          Design language aligned with{" "}
          <a href="https://cto-dashboard.aiwdts.com/" style={{ color: "#2f6feb", fontWeight: 600 }}>
            CTO Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
