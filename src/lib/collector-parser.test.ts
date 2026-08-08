import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCollectorOutput } from "./collector-parser";

describe("parseCollectorOutput", () => {
  it("parses valid collector JSON and infers statuses", () => {
    const raw = JSON.stringify({
      tables: [
        {
          tableName: "A",
          tableCode: "A-1",
          cpuUsage: 20,
          memoryUsage: 30,
          serviceStatus: "Running",
        },
        {
          tableName: "B",
          tableCode: "B-1",
          cpuUsage: 95,
          memoryUsage: 90,
          logs: [{ level: "ERROR", category: "Hardware", message: "fail" }],
        },
        {
          tableName: "C",
          tableCode: "C-1",
          serviceStatus: "Stopped",
        },
      ],
    });

    const parsed = parseCollectorOutput(raw);
    assert.equal(parsed.counts.total, 3);
    assert.equal(parsed.counts.healthy, 1);
    assert.equal(parsed.counts.critical, 1);
    assert.equal(parsed.counts.offline, 1);
    assert.ok(parsed.healthScore < 100);
  });

  it("rejects invalid JSON", () => {
    assert.throws(() => parseCollectorOutput("{nope"), /valid JSON/);
  });
});
