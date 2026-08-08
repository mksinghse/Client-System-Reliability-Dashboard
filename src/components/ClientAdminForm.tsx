"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ClientAdminForm({ countries }: { countries: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setOk("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          code: fd.get("code"),
          countryId: fd.get("countryId"),
          environment: fd.get("environment"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Unable to create client");
        return;
      }
      setOk("Client created");
      e.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
      <div className="field">
        <label htmlFor="name">Customer name</label>
        <input id="name" name="name" required placeholder="New Resort Casino" />
      </div>
      <div className="field">
        <label htmlFor="code">Client code</label>
        <input id="code" name="code" required placeholder="US-NRC" />
      </div>
      <div className="field">
        <label htmlFor="countryId">Country</label>
        <select id="countryId" name="countryId" required>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="environment">Environment</label>
        <select id="environment" name="environment" defaultValue="Production">
          <option>Production</option>
          <option>Staging</option>
          <option>UAT</option>
        </select>
      </div>
      {error ? <div style={{ color: "#912018", fontSize: "0.88rem" }}>{error}</div> : null}
      {ok ? <div style={{ color: "#14543b", fontSize: "0.88rem" }}>{ok}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add Client"}
      </button>
    </form>
  );
}
