import DiscordRPC from "discord-rpc";
import { buildActivity } from "./presence";
import { mergeStatus, resolveConfig, validateConfig, type RpcConfig } from "./config";
import packageJson from "../package.json";

type RunnableRpcConfig = RpcConfig & { clientId: string };

export function printHelp(): void {
  console.log(`codex-discord-rpc ${packageJson.version}

Discord Rich Presence for Codex sessions.

Usage:
  codex-discord-rpc --client-id <discord-app-id> [options]

Options:
  --client-id <id>              Discord application client ID
  --subscription <name>         Subscription or plan to show
  --working-on <text>           What Codex is working on
  --started-at <time>           ISO time, Unix seconds, or Unix milliseconds
  --config <path>               JSON config file path
  --status-file <path>          JSON status file to poll for live updates
  --large-image-key <key>       Discord app rich presence asset key
  --small-image-key <key>       Discord app rich presence asset key
  --button-label <text>         Optional activity button label
  --button-url <url>            Optional activity button URL
  --update-interval <ms>        Status refresh interval, default 15000
  --version                     Print version
  --help                        Print help

Environment:
  DISCORD_CLIENT_ID / CODEX_DISCORD_CLIENT_ID
  CODEX_SUBSCRIPTION_TYPE
  CODEX_WORKING_ON
  CODEX_STARTED_AT
  CODEX_RPC_STATUS_FILE`);
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const config = resolveConfig({ argv });

  if (config.help) {
    printHelp();
    return;
  }

  if (config.version) {
    console.log(packageJson.version);
    return;
  }

  validateConfig(config);
  await runRpc(config);
}

export async function runRpc(config: RunnableRpcConfig): Promise<void> {
  DiscordRPC.register(config.clientId);

  const client = new DiscordRPC.Client({ transport: "ipc" });
  let lastActivityJson = "";
  let refreshTimer: NodeJS.Timeout | undefined;

  async function publishActivity(): Promise<void> {
    const liveConfig = mergeStatus(config);
    const activity = buildActivity(liveConfig);
    const activityJson = JSON.stringify(activity);

    if (activityJson === lastActivityJson) {
      return;
    }

    await client.setActivity(activity);
    lastActivityJson = activityJson;
    console.log(
      `Presence updated: ${activity.details} | ${activity.state} | since ${liveConfig.startedAt.toISOString()}`
    );
  }

  client.on("ready", () => {
    void (async () => {
      console.log("Connected to Discord RPC.");
      await publishActivity();
      refreshTimer = setInterval(() => {
        publishActivity().catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Could not refresh presence: ${message}`);
        });
      }, config.updateIntervalMs);
    })();
  });

  process.once("SIGINT", () => {
    void shutdown(client, refreshTimer);
  });
  process.once("SIGTERM", () => {
    void shutdown(client, refreshTimer);
  });

  console.log("Starting Codex Discord RPC...");
  await client.login({ clientId: config.clientId });
}

async function shutdown(
  client: InstanceType<typeof DiscordRPC.Client>,
  refreshTimer: NodeJS.Timeout | undefined
): Promise<void> {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  try {
    await client.clearActivity();
  } catch (_error: unknown) {
    // Discord may already be closed; shutdown should still finish quietly.
  }

  client.destroy();
  process.exit(0);
}
