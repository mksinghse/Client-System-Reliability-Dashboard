"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UploadForm({
  clients,
  initialClientId,
}: {
  clients: Array<{ id: string; name: string }>;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a collector JSON file");
      return;
    }

    startTransition(async () => {
      const text = await file.text();
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, fileName: file.name, raw: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setMessage(`Processed ${data.parsedTables} tables successfully.`);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
      <div className="field">
        <label htmlFor="clientId">Client</label>
        <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="file">Collector JSON</label>
        <input id="file" name="file" type="file" accept="application/json,.json" />
      </div>
      {error ? <div style={{ color: "#912018", fontSize: "0.88rem" }}>{error}</div> : null}
      {message ? <div style={{ color: "#14543b", fontSize: "0.88rem" }}>{message}</div> : null}
      <button className="btn btn-primary" type="submit" disabled={pending || !clientId}>
        {pending ? "Processing…" : "Upload & Process"}
      </button>
    </form>
  );
}
