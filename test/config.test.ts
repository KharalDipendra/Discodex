import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  mergeStatus,
  parseCliArgs,
  parseStartedAt,
  resolveConfig,
  validateConfig
} from "../src/config";

test("CLI options support dashed names and inline values", () => {
  assert.deepEqual(
    parseCliArgs([
      "--client-id=123",
      "--subscription",
      "ChatGPT Pro",
      "--working-on",
      "Writing tests"
    ]),
    {
      clientId: "123",
      subscriptionType: "ChatGPT Pro",
      workingOn: "Writing tests"
    }
  );
});

test("CLI values override env and config file values", () => {
  const cwd = makeTempDirectory();
  fs.writeFileSync(
    path.join(cwd, "codex-rpc.config.json"),
    JSON.stringify({
      clientId: "from-config",
      subscriptionType: "Team",
      workingOn: "Config work"
    })
  );

  const config = resolveConfig({
    cwd,
    argv: ["--working-on", "CLI work"],
    env: {
      DISCORD_CLIENT_ID: "from-env",
      CODEX_SUBSCRIPTION_TYPE: "Plus"
    },
    processStartedAt: new Date("2026-06-24T00:00:00.000Z")
  });

  assert.equal(config.clientId, "from-env");
  assert.equal(config.subscriptionType, "Plus");
  assert.equal(config.workingOn, "CLI work");
});

test("startedAt accepts ISO strings and Unix seconds", () => {
  assert.equal(
    parseStartedAt("2026-06-24T01:02:03.000Z").toISOString(),
    "2026-06-24T01:02:03.000Z"
  );
  assert.equal(parseStartedAt("1782262923").toISOString(), "2026-06-24T01:02:03.000Z");
});

test("status file can update live presence fields", () => {
  const cwd = makeTempDirectory();
  const statusFile = path.join(cwd, "status.json");
  fs.writeFileSync(
    statusFile,
    JSON.stringify({
      subscriptionType: "ChatGPT Plus",
      workingOn: "Fixing RPC status",
      startedAt: "2026-06-24T10:30:00.000Z"
    })
  );

  const config = resolveConfig({
    cwd,
    argv: ["--client-id", "123", "--status-file", statusFile],
    env: {},
    processStartedAt: new Date("2026-06-24T09:00:00.000Z")
  });
  const merged = mergeStatus(config);

  assert.equal(merged.subscriptionType, "ChatGPT Plus");
  assert.equal(merged.workingOn, "Fixing RPC status");
  assert.equal(merged.startedAt.toISOString(), "2026-06-24T10:30:00.000Z");
});

test("client ID is required before connecting to Discord", () => {
  assert.throws(
    () => validateConfig(resolveConfig({ argv: [], env: {}, cwd: makeTempDirectory() })),
    /Missing Discord client ID/
  );
});

function makeTempDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codex-rpc-"));
}
