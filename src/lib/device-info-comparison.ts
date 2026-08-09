import comparison from "../../data/device-info-client-comparison.json";

export type DeviceInfoClient = {
  client: string;
  total: number;
  ok: number;
  failed: number;
  okPct: number;
  ram: string;
  ramUniform: boolean;
  type: string;
  brands: string;
  heapNow: string;
  heapDist?: Record<string, number>;
  fleetMax: string;
  osPrimary: string;
  tempAvg: number;
  tempMax: number;
  hot70: number;
  collected: string;
};

export const DEVICE_INFO_CLIENTS = comparison.clients as unknown as DeviceInfoClient[];

export function getDeviceInfoFleetSummary() {
  const fleetTotal = DEVICE_INFO_CLIENTS.reduce((s, c) => s + c.total, 0);
  const fleetOk = DEVICE_INFO_CLIENTS.reduce((s, c) => s + c.ok, 0);
  const fleetFailed = DEVICE_INFO_CLIENTS.reduce((s, c) => s + c.failed, 0);
  return {
    fleetTotal,
    fleetOk,
    fleetFailed,
    clientCount: DEVICE_INFO_CLIENTS.length,
    clients: DEVICE_INFO_CLIENTS,
  };
}

/** Map comparison short names to seeded Client.code values. */
export const COMPARISON_CODE_BY_NAME: Record<string, string> = {
  GM: "GM",
  Melco: "MELCO",
  SJM: "SJM",
  SW: "SW",
  Wynn: "WYNN",
  MGM: "MGM",
};
