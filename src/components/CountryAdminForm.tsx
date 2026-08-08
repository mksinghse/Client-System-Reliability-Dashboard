"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CountryAdminForm() {
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
      const res = await fetch("/api/admin/countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          code: fd.get("code"),
          region: fd.get("region"),
          latitude: Number(fd.get("latitude") || 0),
          longitude: Number(fd.get("longitude") || 0),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Unable to create country");
        return;
      }
      setOk("Country created");
      e.currentTarget.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
      <div className="field">
        <label htmlFor="name">Country name</label>
        <input id="name" name="name" required placeholder="France" />
      </div>
      <div className="field">
        <label htmlFor="code">ISO code</label>
        <input id="code" name="code" required placeholder="FR" maxLength={8} />
      </div>
      <div className="field">
        <label htmlFor="region">Region</label>
        <select id="region" name="region" defaultValue="EMEA">
          <option>Americas</option>
          <option>EMEA</option>
          <option>APAC</option>
        </select>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="latitude">Latitude</label>
          <input id="latitude" name="latitude" type="number" step="0.1" defaultValue={46.2} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="longitude">Longitude</label>
          <input id="longitude" name="longitude" type="number" step="0.1" defaultValue={2.2} />
        </div>
      </div>
      {error ? <div style={{ color: "#912018", fontSize: "0.88rem" }}>{error}</div> : null}
      {ok ? <div style={{ color: "#14543b", fontSize: "0.88rem" }}>{ok}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add Country"}
      </button>
    </form>
  );
}
