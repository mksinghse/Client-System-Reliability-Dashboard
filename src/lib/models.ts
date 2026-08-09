export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "OFFLINE";
export type UserRole = "VIEWER" | "OPERATOR" | "ADMIN";
export type UploadStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "PARTIAL";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type Country = {
  id: string;
  code: string;
  name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  name: string;
  code: string;
  countryId: string;
  environment: string;
  healthScore: number;
  healthStatus: HealthStatus;
  tableCount: number;
  criticalIssues: number;
  warningIssues: number;
  availabilityPct: number;
  lastUploadAt: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Peripheral = {
  id: string;
  tableId: string;
  name: string;
  type: string;
  status: string;
  details?: string | null;
};

export type TableLog = {
  id: string;
  tableId: string;
  level: string;
  category: string;
  message: string;
  occurredAt: string;
};

export type HardwareTable = {
  id: string;
  clientId: string;
  tableName: string;
  tableCode: string;
  status: HealthStatus;
  firmwareVer?: string | null;
  appVersion?: string | null;
  osInfo?: string | null;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  storageUsage?: number | null;
  networkInfo?: string | null;
  serviceStatus?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
  peripherals?: Peripheral[];
  logs?: TableLog[];
};

export type CollectorUpload = {
  id: string;
  clientId: string;
  uploadedById?: string | null;
  fileName: string;
  fileSize: number;
  status: UploadStatus;
  parsedTables: number;
  errorMessage?: string | null;
  rawPayload?: string | null;
  processedAt?: string | null;
  createdAt: string;
};

export type DiagnosticFinding = {
  id: string;
  clientId: string;
  severity: HealthStatus;
  category: string;
  title: string;
  description: string;
  recommendation?: string | null;
  tableCode?: string | null;
  resolved: boolean;
  createdAt: string;
};

export type HealthSnapshot = {
  id: string;
  clientId: string;
  healthScore: number;
  healthy: number;
  warning: number;
  critical: number;
  offline: number;
  capturedAt: string;
};

export type ClientMetric = {
  id: string;
  clientId: string;
  metricKey: string;
  value: number;
  unit?: string | null;
  capturedAt: string;
};

export type AuditLog = {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
};

export type ClientWithCountry = Client & { country: Country };
