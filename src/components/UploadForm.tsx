"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ClientOption = {
  id: string;
  name: string;
  code: string;
  countryId: string;
  countryCode: string;
  countryName: string;
};

type CountryOption = {
  code: string;
  name: string;
  region: string;
  existingId?: string;
};

export function UploadForm({
  clients,
  catalogCountries,
  existingCountries,
  initialClientId,
}: {
  clients: ClientOption[];
  catalogCountries: Array<{ code: string; name: string; region: string }>;
  existingCountries: Array<{ id: string; code: string; name: string; region: string }>;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">(
    initialClientId ? "existing" : clients.length ? "existing" : "new",
  );
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? "");
  const [countryCode, setCountryCode] = useState(
    existingCountries[0]?.code ?? catalogCountries[0]?.code ?? "MO",
  );
  const [customCountry, setCustomCountry] = useState(false);
  const [customCountryCode, setCustomCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [region, setRegion] = useState("APAC");
  const [clientCode, setClientCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [environment, setEnvironment] = useState("Production");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const countryChoices = useMemo(() => {
    const map = new Map<string, CountryOption>();
    for (const c of catalogCountries) {
      map.set(c.code, { code: c.code, name: c.name, region: c.region });
    }
    for (const c of existingCountries) {
      map.set(c.code, {
        code: c.code,
        name: c.name,
        region: c.region,
        existingId: c.id,
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogCountries, existingCountries]);

  const selectedCountry = countryChoices.find((c) => c.code === countryCode);
  const clientsInCountry = clients.filter((c) => c.countryCode === countryCode);
  const existingCountryCodes = new Set(existingCountries.map((c) => c.code));

  function onCountryChange(code: string) {
    if (code === "__custom__") {
      setCustomCountry(true);
      setCountryCode("");
      setCountryName("");
      setRegion("APAC");
      return;
    }
    setCustomCountry(false);
    setCountryCode(code);
    const match = countryChoices.find((c) => c.code === code);
    if (match) {
      setCountryName(match.name);
      setRegion(match.region);
    }
    const first = clients.find((c) => c.countryCode === code);
    if (first) setClientId(first.id);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("Choose a .zip, collector .json, or *_SUPPORT.log file");
      return;
    }

    startTransition(async () => {
      const resolvedCountryCode = customCountry ? customCountryCode.trim().toUpperCase() : countryCode;
      if (mode === "new" && !resolvedCountryCode) {
        setError("Country code is required");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      if (mode === "existing") {
        formData.append("clientId", clientId);
      } else {
        formData.append("countryCode", resolvedCountryCode);
        formData.append("countryName", countryName || selectedCountry?.name || resolvedCountryCode);
        formData.append("region", region || selectedCountry?.region || "APAC");
        formData.append("clientCode", clientCode || clientName);
        formData.append("clientName", clientName || clientCode);
        formData.append("environment", environment);
      }

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      const kind =
        data.sourceKind === "zip"
          ? `zip (${data.extractedFiles ?? 0} files)`
          : data.sourceKind === "support-log"
            ? "SUPPORT.log"
            : "JSON";
      setMessage(
        `Processed ${data.parsedTables} tables from ${kind} for ${data.client?.name ?? "client"}${
          data.createdCountry ? " · country added" : ""
        }${data.createdClient ? " · client added" : ""}.`,
      );
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ marginTop: 12 }}>
      <div className="field">
        <label>Target</label>
        <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
          <button
            type="button"
            className={`btn ${mode === "existing" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("existing")}
            disabled={!clients.length}
          >
            Existing client
          </button>
          <button
            type="button"
            className={`btn ${mode === "new" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("new")}
          >
            Ask country & client
          </button>
        </div>
        <p className="muted" style={{ margin: "0.45rem 0 0", fontSize: "0.8rem" }}>
          Countries show up only when they have data. Choosing a new country on upload creates it automatically.
        </p>
      </div>

      {mode === "existing" ? (
        <>
          <div className="field">
            <label htmlFor="filterCountry">Country</label>
            <select id="filterCountry" value={countryCode} onChange={(e) => onCountryChange(e.target.value)}>
              {countryChoices
                .filter((c) => existingCountryCodes.has(c.code))
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="clientId">Client</label>
            <select id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
              {(clientsInCountry.length ? clientsInCountry : clients).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.countryName} · {c.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="countryCode">Country</label>
            <select
              id="countryCode"
              value={customCountry ? "__custom__" : countryCode}
              onChange={(e) => onCountryChange(e.target.value)}
            >
              {countryChoices.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                  {existingCountryCodes.has(c.code) ? "" : " · will be added"}
                </option>
              ))}
              <option value="__custom__">Other / enter country…</option>
            </select>
          </div>
          {customCountry ? (
            <div className="grid-2">
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="customCountryCode">Country code</label>
                <input
                  id="customCountryCode"
                  value={customCountryCode}
                  onChange={(e) => setCustomCountryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MY"
                  required
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="countryName">Country name</label>
                <input
                  id="countryName"
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder="e.g. Malaysia"
                  required
                />
              </div>
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="region">Region</label>
            <input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="APAC / Americas / EMEA"
            />
          </div>
          <div className="grid-2">
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="clientCode">Client code</label>
              <input
                id="clientCode"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                placeholder="e.g. NEWCO"
                required
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="clientName">Client name</label>
              <input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Display name"
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="environment">Environment</label>
            <select id="environment" value={environment} onChange={(e) => setEnvironment(e.target.value)}>
              <option value="Production">Production</option>
              <option value="Staging">Staging</option>
              <option value="UAT">UAT</option>
            </select>
          </div>
        </>
      )}

      <div className="field">
        <label htmlFor="file">Collector package</label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".zip,application/zip,.json,application/json,.log,.txt,text/plain"
        />
        <p className="muted" style={{ margin: "0.45rem 0 0", fontSize: "0.8rem" }}>
          Accepts <code>.zip</code> (extracts *_SUPPORT.log / collector JSON), single SUPPORT.log, or
          collector JSON.
        </p>
      </div>
      {error ? <div style={{ color: "#912018", fontSize: "0.88rem" }}>{error}</div> : null}
      {message ? <div style={{ color: "#14543b", fontSize: "0.88rem" }}>{message}</div> : null}
      <button
        className="btn btn-primary"
        type="submit"
        disabled={pending || (mode === "existing" ? !clientId : false)}
      >
        {pending ? "Processing…" : "Upload & Process"}
      </button>
    </form>
  );
}
