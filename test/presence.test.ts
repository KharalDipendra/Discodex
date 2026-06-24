import assert from "node:assert/strict";
import test from "node:test";

import { buildActivity, fitDiscordText } from "../src/presence";
import type { RpcConfig } from "../src/config";

test("activity includes subscription, work, and elapsed timer start", () => {
  const startedAt = new Date("2026-06-24T01:02:03.000Z");
  const config: RpcConfig = {
    clientId: "123",
    subscriptionType: "ChatGPT Pro",
    workingOn: "Building a Discord RPC for Codex",
    workspace: "codex-discord-rpc",
    startedAt,
    updateIntervalMs: 15_000,
    largeImageKey: "codex",
    largeImageText: "Codex",
    buttons: [{ label: "GitHub", url: "https://github.com/example/repo" }]
  };
  const activity = buildActivity(config);

  assert.equal(activity.details, "Working on: Building a Discord RPC for Codex");
  assert.equal(activity.state, "Plan: ChatGPT Pro");
  assert.equal(activity.startTimestamp, startedAt);
  assert.deepEqual(activity.buttons, [
    { label: "GitHub", url: "https://github.com/example/repo" }
  ]);
});

test("Discord text is normalized and capped", () => {
  const text = fitDiscordText(`A ${"very ".repeat(40)}long status`, 32);
  assert.equal(text.length, 32);
  assert.match(text, /…$/);
});
