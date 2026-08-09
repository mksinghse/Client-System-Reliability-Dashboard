import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { getDocClient, getTableName } from "./client";
import { newId, nowIso } from "./ids";
import type {
  AuditLog,
  Client,
  ClientMetric,
  ClientWithCountry,
  CollectorUpload,
  Country,
  DiagnosticFinding,
  HardwareTable,
  HealthSnapshot,
  HealthStatus,
  User,
  UserRole,
} from "../models";

type Item = Record<string, unknown>;

const MAX_RAW = 300_000;

function doc() {
  return getDocClient();
}
function table() {
  return getTableName();
}

async function put(item: Item) {
  await doc().send(new PutCommand({ TableName: table(), Item: item }));
}

async function get(pk: string, sk: string): Promise<Item | null> {
  const res = await doc().send(new GetCommand({ TableName: table(), Key: { pk, sk } }));
  return (res.Item as Item) ?? null;
}

async function queryPk(pk: string, skPrefix?: string): Promise<Item[]> {
  const res = await doc().send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: skPrefix
        ? "pk = :pk AND begins_with(sk, :sk)"
        : "pk = :pk",
      ExpressionAttributeValues: skPrefix
        ? { ":pk": pk, ":sk": skPrefix }
        : { ":pk": pk },
    }),
  );
  return (res.Items as Item[]) ?? [];
}

async function queryGsi1(gsi1pk: string): Promise<Item[]> {
  const res = await doc().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :g",
      ExpressionAttributeValues: { ":g": gsi1pk },
    }),
  );
  return (res.Items as Item[]) ?? [];
}

async function queryGsi2(gsi2pk: string): Promise<Item[]> {
  const res = await doc().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :g",
      ExpressionAttributeValues: { ":g": gsi2pk },
    }),
  );
  return (res.Items as Item[]) ?? [];
}

async function scanEntity(entity: string): Promise<Item[]> {
  const res = await doc().send(
    new ScanCommand({
      TableName: table(),
      FilterExpression: "entity = :e",
      ExpressionAttributeValues: { ":e": entity },
    }),
  );
  return (res.Items as Item[]) ?? [];
}

function asUser(i: Item): User {
  return {
    id: String(i.id),
    email: String(i.email),
    name: String(i.name),
    role: i.role as UserRole,
    createdAt: String(i.createdAt),
    updatedAt: String(i.updatedAt),
  };
}

function asCountry(i: Item): Country {
  return {
    id: String(i.id),
    code: String(i.code),
    name: String(i.name),
    region: String(i.region),
    latitude: (i.latitude as number | null) ?? null,
    longitude: (i.longitude as number | null) ?? null,
    createdAt: String(i.createdAt),
    updatedAt: String(i.updatedAt),
  };
}

function asClient(i: Item): Client {
  return {
    id: String(i.id),
    name: String(i.name),
    code: String(i.code),
    countryId: String(i.countryId),
    environment: String(i.environment ?? "Production"),
    healthScore: Number(i.healthScore ?? 100),
    healthStatus: (i.healthStatus as HealthStatus) ?? "HEALTHY",
    tableCount: Number(i.tableCount ?? 0),
    criticalIssues: Number(i.criticalIssues ?? 0),
    warningIssues: Number(i.warningIssues ?? 0),
    availabilityPct: Number(i.availabilityPct ?? 100),
    lastUploadAt: i.lastUploadAt ? String(i.lastUploadAt) : null,
    archived: Boolean(i.archived),
    createdAt: String(i.createdAt),
    updatedAt: String(i.updatedAt),
  };
}

function asTable(i: Item): HardwareTable {
  return {
    id: String(i.id),
    clientId: String(i.clientId),
    tableName: String(i.tableName),
    tableCode: String(i.tableCode),
    status: (i.status as HealthStatus) ?? "HEALTHY",
    firmwareVer: (i.firmwareVer as string | null) ?? null,
    appVersion: (i.appVersion as string | null) ?? null,
    osInfo: (i.osInfo as string | null) ?? null,
    cpuUsage: (i.cpuUsage as number | null) ?? null,
    memoryUsage: (i.memoryUsage as number | null) ?? null,
    storageUsage: (i.storageUsage as number | null) ?? null,
    networkInfo: (i.networkInfo as string | null) ?? null,
    serviceStatus: (i.serviceStatus as string | null) ?? null,
    lastSeenAt: i.lastSeenAt ? String(i.lastSeenAt) : null,
    createdAt: String(i.createdAt),
    updatedAt: String(i.updatedAt),
    peripherals: (i.peripherals as HardwareTable["peripherals"]) ?? [],
    logs: (i.logs as HardwareTable["logs"]) ?? [],
  };
}

function asUpload(i: Item): CollectorUpload {
  return {
    id: String(i.id),
    clientId: String(i.clientId),
    uploadedById: (i.uploadedById as string | null) ?? null,
    fileName: String(i.fileName),
    fileSize: Number(i.fileSize ?? 0),
    status: i.status as CollectorUpload["status"],
    parsedTables: Number(i.parsedTables ?? 0),
    errorMessage: (i.errorMessage as string | null) ?? null,
    rawPayload: (i.rawPayload as string | null) ?? null,
    processedAt: i.processedAt ? String(i.processedAt) : null,
    createdAt: String(i.createdAt),
  };
}

function asFinding(i: Item): DiagnosticFinding {
  return {
    id: String(i.id),
    clientId: String(i.clientId),
    severity: i.severity as HealthStatus,
    category: String(i.category),
    title: String(i.title),
    description: String(i.description),
    recommendation: (i.recommendation as string | null) ?? null,
    tableCode: (i.tableCode as string | null) ?? null,
    resolved: Boolean(i.resolved),
    createdAt: String(i.createdAt),
  };
}

function asSnap(i: Item): HealthSnapshot {
  return {
    id: String(i.id),
    clientId: String(i.clientId),
    healthScore: Number(i.healthScore),
    healthy: Number(i.healthy),
    warning: Number(i.warning),
    critical: Number(i.critical),
    offline: Number(i.offline),
    capturedAt: String(i.capturedAt),
  };
}

function asMetric(i: Item): ClientMetric {
  return {
    id: String(i.id),
    clientId: String(i.clientId),
    metricKey: String(i.metricKey),
    value: Number(i.value),
    unit: (i.unit as string | null) ?? null,
    capturedAt: String(i.capturedAt),
  };
}

function asAudit(i: Item): AuditLog {
  return {
    id: String(i.id),
    userId: (i.userId as string | null) ?? null,
    action: String(i.action),
    entityType: String(i.entityType),
    entityId: (i.entityId as string | null) ?? null,
    details: (i.details as string | null) ?? null,
    createdAt: String(i.createdAt),
  };
}

export const store = {
  async getUserByEmail(email: string): Promise<User | null> {
    const item = await get(`USER#${email.toLowerCase()}`, "PROFILE");
    return item ? asUser(item) : null;
  },

  async putUser(data: { email: string; name: string; role?: UserRole }): Promise<User> {
    const email = data.email.toLowerCase();
    const existing = await this.getUserByEmail(email);
    const now = nowIso();
    const user: User = existing
      ? { ...existing, name: data.name, role: data.role ?? existing.role, updatedAt: now }
      : {
          id: newId("usr"),
          email,
          name: data.name,
          role: data.role ?? "VIEWER",
          createdAt: now,
          updatedAt: now,
        };
    await put({
      pk: `USER#${email}`,
      sk: "PROFILE",
      entity: "User",
      gsi1pk: `USERID#${user.id}`,
      gsi1sk: "PROFILE",
      ...user,
    });
    return user;
  },

  async listCountries(): Promise<Country[]> {
    const items = await scanEntity("Country");
    return items.map(asCountry).sort((a, b) => a.name.localeCompare(b.name));
  },

  async getCountryById(id: string): Promise<Country | null> {
    const items = await queryGsi1(`COUNTRYID#${id}`);
    return items[0] ? asCountry(items[0]) : null;
  },

  async getCountryByCode(code: string): Promise<Country | null> {
    const item = await get(`COUNTRY#${code.toUpperCase()}`, "META");
    return item ? asCountry(item) : null;
  },

  async upsertCountry(input: {
    code: string;
    name: string;
    region: string;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<Country> {
    const code = input.code.toUpperCase();
    const existing = await this.getCountryByCode(code);
    const now = nowIso();
    const country: Country = {
      id: existing?.id ?? newId("cty"),
      code,
      name: input.name,
      region: input.region,
      latitude: input.latitude ?? existing?.latitude ?? null,
      longitude: input.longitude ?? existing?.longitude ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await put({
      pk: `COUNTRY#${code}`,
      sk: "META",
      entity: "Country",
      gsi1pk: `COUNTRYID#${country.id}`,
      gsi1sk: "META",
      ...country,
    });
    return country;
  },

  async listClients(opts?: { archived?: boolean; countryId?: string }): Promise<ClientWithCountry[]> {
    let items: Item[];
    if (opts?.countryId) {
      items = await queryGsi2(`COUNTRY#${opts.countryId}`);
    } else {
      items = await scanEntity("Client");
    }
    let clients = items.map(asClient);
    if (opts?.archived === false) clients = clients.filter((c) => !c.archived);
    if (opts?.archived === true) clients = clients.filter((c) => c.archived);
    const countries = await this.listCountries();
    const byId = new Map(countries.map((c) => [c.id, c]));
    return clients
      .map((c) => ({ ...c, country: byId.get(c.countryId)! }))
      .filter((c) => c.country)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getClientById(id: string): Promise<ClientWithCountry | null> {
    const item = await get(`CLIENT#${id}`, "META");
    if (!item) return null;
    const client = asClient(item);
    const country = await this.getCountryById(client.countryId);
    if (!country) return null;
    return { ...client, country };
  },

  async getClientByCode(code: string): Promise<ClientWithCountry | null> {
    const items = await queryGsi1(`CLCODE#${code.toUpperCase()}`);
    if (!items[0]) return null;
    const client = asClient(items[0]);
    const country = await this.getCountryById(client.countryId);
    if (!country) return null;
    return { ...client, country };
  },

  async upsertClient(input: {
    code: string;
    name: string;
    countryId: string;
    environment?: string;
    archived?: boolean;
  }): Promise<ClientWithCountry> {
    const code = input.code.toUpperCase();
    const existing = await this.getClientByCode(code);
    const now = nowIso();
    const client: Client = {
      id: existing?.id ?? newId("cli"),
      code,
      name: input.name,
      countryId: input.countryId,
      environment: input.environment ?? existing?.environment ?? "Production",
      healthScore: existing?.healthScore ?? 100,
      healthStatus: existing?.healthStatus ?? "HEALTHY",
      tableCount: existing?.tableCount ?? 0,
      criticalIssues: existing?.criticalIssues ?? 0,
      warningIssues: existing?.warningIssues ?? 0,
      availabilityPct: existing?.availabilityPct ?? 100,
      lastUploadAt: existing?.lastUploadAt ?? null,
      archived: input.archived ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await put({
      pk: `CLIENT#${client.id}`,
      sk: "META",
      entity: "Client",
      gsi1pk: `CLCODE#${code}`,
      gsi1sk: "META",
      gsi2pk: `COUNTRY#${client.countryId}`,
      gsi2sk: `NAME#${client.name}`,
      ...client,
    });
    const country = await this.getCountryById(client.countryId);
    if (!country) throw new Error("Country missing for client");
    return { ...client, country };
  },

  async createClient(input: {
    code: string;
    name: string;
    countryId: string;
    environment?: string;
  }): Promise<ClientWithCountry> {
    const existing = await this.getClientByCode(input.code);
    if (existing) throw new Error("Client code already exists");
    return this.upsertClient(input);
  },

  async updateClient(
    id: string,
    data: Partial<
      Pick<
        Client,
        | "name"
        | "environment"
        | "healthScore"
        | "healthStatus"
        | "tableCount"
        | "criticalIssues"
        | "warningIssues"
        | "availabilityPct"
        | "lastUploadAt"
        | "archived"
        | "countryId"
      >
    >,
  ): Promise<ClientWithCountry> {
    const current = await this.getClientById(id);
    if (!current) throw new Error("Client not found");
    const now = nowIso();
    const client: Client = {
      ...current,
      ...data,
      updatedAt: now,
    };
    await put({
      pk: `CLIENT#${client.id}`,
      sk: "META",
      entity: "Client",
      gsi1pk: `CLCODE#${client.code}`,
      gsi1sk: "META",
      gsi2pk: `COUNTRY#${client.countryId}`,
      gsi2sk: `NAME#${client.name}`,
      ...client,
    });
    const country = await this.getCountryById(client.countryId);
    if (!country) throw new Error("Country missing for client");
    return { ...client, country };
  },

  async listTables(clientId: string): Promise<HardwareTable[]> {
    const items = await queryPk(`CLIENT#${clientId}`, "TABLE#");
    return items.map(asTable).sort((a, b) => a.tableName.localeCompare(b.tableName));
  },

  async upsertHardwareTable(
    clientId: string,
    tableRow: Omit<HardwareTable, "id" | "createdAt" | "updatedAt" | "clientId"> & {
      id?: string;
    },
  ): Promise<HardwareTable> {
    const existingItems = await queryPk(`CLIENT#${clientId}`, `TABLE#${tableRow.tableCode}`);
    const existing = existingItems[0] ? asTable(existingItems[0]) : null;
    const now = nowIso();
    const saved: HardwareTable = {
      id: existing?.id ?? tableRow.id ?? newId("tbl"),
      clientId,
      tableName: tableRow.tableName,
      tableCode: tableRow.tableCode,
      status: tableRow.status,
      firmwareVer: tableRow.firmwareVer ?? null,
      appVersion: tableRow.appVersion ?? null,
      osInfo: tableRow.osInfo ?? null,
      cpuUsage: tableRow.cpuUsage ?? null,
      memoryUsage: tableRow.memoryUsage ?? null,
      storageUsage: tableRow.storageUsage ?? null,
      networkInfo: tableRow.networkInfo ?? null,
      serviceStatus: tableRow.serviceStatus ?? null,
      lastSeenAt: tableRow.lastSeenAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      peripherals: tableRow.peripherals ?? [],
      logs: (tableRow.logs ?? []).slice(0, 20),
    };
    await put({
      pk: `CLIENT#${clientId}`,
      sk: `TABLE#${saved.tableCode}`,
      entity: "HardwareTable",
      ...saved,
    });
    return saved;
  },

  async createUpload(data: {
    clientId: string;
    fileName: string;
    fileSize: number;
    status: CollectorUpload["status"];
    rawPayload?: string;
    uploadedById?: string;
  }): Promise<CollectorUpload> {
    const now = nowIso();
    const upload: CollectorUpload = {
      id: newId("upl"),
      clientId: data.clientId,
      uploadedById: data.uploadedById ?? null,
      fileName: data.fileName,
      fileSize: data.fileSize,
      status: data.status,
      parsedTables: 0,
      errorMessage: null,
      rawPayload: data.rawPayload ? data.rawPayload.slice(0, MAX_RAW) : null,
      processedAt: null,
      createdAt: now,
    };
    await put({
      pk: `CLIENT#${upload.clientId}`,
      sk: `UPLOAD#${upload.createdAt}#${upload.id}`,
      entity: "CollectorUpload",
      gsi1pk: "UPLOADS",
      gsi1sk: `${upload.createdAt}#${upload.id}`,
      ...upload,
    });
    return upload;
  },

  async updateUpload(
    upload: CollectorUpload,
    data: Partial<Pick<CollectorUpload, "status" | "parsedTables" | "errorMessage" | "processedAt">>,
  ): Promise<CollectorUpload> {
    const next = { ...upload, ...data };
    await put({
      pk: `CLIENT#${next.clientId}`,
      sk: `UPLOAD#${next.createdAt}#${next.id}`,
      entity: "CollectorUpload",
      gsi1pk: "UPLOADS",
      gsi1sk: `${next.createdAt}#${next.id}`,
      ...next,
      rawPayload: next.rawPayload ? next.rawPayload.slice(0, MAX_RAW) : null,
    });
    return next;
  },

  async getUpload(clientId: string, createdAt: string, id: string): Promise<CollectorUpload | null> {
    const item = await get(`CLIENT#${clientId}`, `UPLOAD#${createdAt}#${id}`);
    return item ? asUpload(item) : null;
  },

  async listUploads(opts?: { clientId?: string; take?: number }): Promise<
    Array<CollectorUpload & { client?: ClientWithCountry }>
  > {
    let items: Item[];
    if (opts?.clientId) {
      items = await queryPk(`CLIENT#${opts.clientId}`, "UPLOAD#");
    } else {
      items = await queryGsi1("UPLOADS");
    }
    const uploads = items
      .map(asUpload)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts?.take ?? 50);
    const out = [];
    for (const u of uploads) {
      const client = await this.getClientById(u.clientId);
      out.push({ ...u, client: client ?? undefined });
    }
    return out;
  },

  async replaceFindings(
    clientId: string,
    findings: Array<Omit<DiagnosticFinding, "id" | "createdAt" | "clientId" | "resolved">>,
  ): Promise<void> {
    const existing = await queryPk(`CLIENT#${clientId}`, "FINDING#");
    for (const item of existing) {
      if (!item.resolved) {
        await doc().send(
          new DeleteCommand({ TableName: table(), Key: { pk: item.pk, sk: item.sk } }),
        );
      }
    }
    const now = nowIso();
    for (const f of findings) {
      const id = newId("fnd");
      await put({
        pk: `CLIENT#${clientId}`,
        sk: `FINDING#${id}`,
        entity: "DiagnosticFinding",
        id,
        clientId,
        resolved: false,
        createdAt: now,
        ...f,
      });
    }
  },

  async listFindings(clientId: string, unresolvedOnly = true): Promise<DiagnosticFinding[]> {
    const items = await queryPk(`CLIENT#${clientId}`, "FINDING#");
    return items
      .map(asFinding)
      .filter((f) => (unresolvedOnly ? !f.resolved : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createSnapshot(data: Omit<HealthSnapshot, "id" | "capturedAt"> & { capturedAt?: string }) {
    const snap: HealthSnapshot = {
      id: newId("snp"),
      capturedAt: data.capturedAt ?? nowIso(),
      ...data,
    };
    await put({
      pk: `CLIENT#${snap.clientId}`,
      sk: `SNAP#${snap.capturedAt}#${snap.id}`,
      entity: "HealthSnapshot",
      gsi1pk: "SNAPS",
      gsi1sk: snap.capturedAt,
      ...snap,
    });
    return snap;
  },

  async listSnapshots(opts: { clientId?: string; since?: string; take?: number }): Promise<HealthSnapshot[]> {
    let items: Item[];
    if (opts.clientId) {
      items = await queryPk(`CLIENT#${opts.clientId}`, "SNAP#");
    } else {
      items = await queryGsi1("SNAPS");
    }
    return items
      .map(asSnap)
      .filter((s) => (opts.since ? s.capturedAt >= opts.since : true))
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
      .slice(0, opts.take ?? 200);
  },

  async listMetrics(clientId: string, keys?: string[], take = 60): Promise<ClientMetric[]> {
    const items = await queryPk(`CLIENT#${clientId}`, "METRIC#");
    return items
      .map(asMetric)
      .filter((m) => (keys?.length ? keys.includes(m.metricKey) : true))
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .slice(0, take);
  },

  async putMetric(data: Omit<ClientMetric, "id" | "capturedAt"> & { capturedAt?: string }) {
    const metric: ClientMetric = {
      id: newId("met"),
      capturedAt: data.capturedAt ?? nowIso(),
      ...data,
    };
    await put({
      pk: `CLIENT#${metric.clientId}`,
      sk: `METRIC#${metric.metricKey}#${metric.capturedAt}#${metric.id}`,
      entity: "ClientMetric",
      ...metric,
    });
    return metric;
  },

  async createAudit(data: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> {
    const audit: AuditLog = {
      id: newId("aud"),
      createdAt: nowIso(),
      ...data,
    };
    await put({
      pk: "AUDIT",
      sk: `${audit.createdAt}#${audit.id}`,
      entity: "AuditLog",
      ...audit,
    });
    return audit;
  },

  async listAudits(take = 12): Promise<Array<AuditLog & { user?: User | null }>> {
    const items = await queryPk("AUDIT");
    const audits = items
      .map(asAudit)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, take);
    const out = [];
    for (const a of audits) {
      let user: User | null = null;
      if (a.userId) {
        const byId = await queryGsi1(`USERID#${a.userId}`);
        user = byId[0] ? asUser(byId[0]) : null;
      }
      out.push({ ...a, user });
    }
    return out;
  },

  async countClients(archived = false): Promise<number> {
    const clients = await this.listClients({ archived });
    return clients.length;
  },

  async countUploads(status?: CollectorUpload["status"]): Promise<number> {
    const uploads = await this.listUploads({ take: 5000 });
    return status ? uploads.filter((u) => u.status === status).length : uploads.length;
  },

  async groupTableStatus(): Promise<Record<HealthStatus, number>> {
    const clients = await this.listClients({ archived: false });
    const map: Record<HealthStatus, number> = {
      HEALTHY: 0,
      WARNING: 0,
      CRITICAL: 0,
      OFFLINE: 0,
    };
    for (const c of clients) {
      const tables = await this.listTables(c.id);
      for (const t of tables) map[t.status] += 1;
    }
    return map;
  },

  async groupFindingsByCategory(): Promise<Array<{ category: string; count: number }>> {
    const clients = await this.listClients({ archived: false });
    const counts = new Map<string, number>();
    for (const c of clients) {
      const findings = await this.listFindings(c.id, true);
      for (const f of findings) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  },
};
