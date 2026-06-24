import fs from "node:fs";
import path from "node:path";

export interface PresenceButton {
  label: string;
  url: string;
}

export interface RpcConfig {
  clientId?: string;
  subscriptionType: string;
  workingOn: string;
  workspace: string;
  startedAt: Date;
  statusFile?: string;
  configFile?: string;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  buttons: PresenceButton[];
  updateIntervalMs: number;
  help?: boolean;
  version?: boolean;
}

type RawConfig = Partial<
  Omit<RpcConfig, "buttons" | "startedAt" | "updateIntervalMs">
> & {
  buttons?: PresenceButton[];
  configFile?: string;
  startedAt?: Date | number | string;
  updateIntervalMs?: number | string;
};

interface ConfigLoadResult {
  config: RawConfig;
  directory?: string;
  filePath?: string;
}

interface ResolveConfigOptions {
  argv?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  processStartedAt?: Date;
}

export const DEFAULT_CONFIG_FILES = ["codex-rpc.config.json", "codex-rpc.json"];
export const DEFAULT_UPDATE_INTERVAL_MS = 15_000;

const MAX_BUTTONS = 2;

const ENV_MAP: Record<keyof RawConfig, string[]> = {
  clientId: ["CODEX_DISCORD_CLIENT_ID", "DISCORD_CLIENT_ID"],
  subscriptionType: ["CODEX_SUBSCRIPTION_TYPE", "CODEX_PLAN"],
  workingOn: ["CODEX_WORKING_ON", "CODEX_TASK"],
  workspace: ["CODEX_WORKSPACE"],
  startedAt: ["CODEX_STARTED_AT", "CODEX_RPC_STARTED_AT"],
  statusFile: ["CODEX_RPC_STATUS_FILE"],
  configFile: [],
  largeImageKey: ["CODEX_RPC_LARGE_IMAGE_KEY"],
  largeImageText: ["CODEX_RPC_LARGE_IMAGE_TEXT"],
  smallImageKey: ["CODEX_RPC_SMALL_IMAGE_KEY"],
  smallImageText: ["CODEX_RPC_SMALL_IMAGE_TEXT"],
  buttonLabel: ["CODEX_RPC_BUTTON_LABEL"],
  buttonUrl: ["CODEX_RPC_BUTTON_URL"],
  buttons: [],
  updateIntervalMs: ["CODEX_RPC_UPDATE_INTERVAL_MS"],
  help: [],
  version: []
};

const CLI_ALIASES: Record<string, keyof RawConfig> = {
  "client-id": "clientId",
  subscription: "subscriptionType",
  plan: "subscriptionType",
  "working-on": "workingOn",
  work: "workingOn",
  workspace: "workspace",
  "started-at": "startedAt",
  config: "configFile",
  "status-file": "statusFile",
  "large-image-key": "largeImageKey",
  "large-image-text": "largeImageText",
  "small-image-key": "smallImageKey",
  "small-image-text": "smallImageText",
  "button-label": "buttonLabel",
  "button-url": "buttonUrl",
  "update-interval": "updateIntervalMs",
  "update-interval-ms": "updateIntervalMs",
  help: "help",
  version: "version"
};

export function resolveConfig(options: ResolveConfigOptions = {}): RpcConfig {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const argv = options.argv ?? [];
  const processStartedAt = options.processStartedAt ?? new Date();

  const cli = parseCliArgs(argv);
  const configLoad = loadConfigFile(cli.configFile, cwd);
  const envConfig = readEnvConfig(env);

  const merged = mergeObjects(
    {
      subscriptionType: "Plan not set",
      workingOn: defaultWorkingOn(cwd),
      startedAt: processStartedAt,
      updateIntervalMs: DEFAULT_UPDATE_INTERVAL_MS,
      largeImageKey: "codex",
      largeImageText: "Codex",
      smallImageText: "Coding with Codex"
    },
    configLoad.config,
    envConfig,
    cli
  );

  const workspace = merged.workspace ?? path.basename(cwd);
  const statusFile = merged.statusFile
    ? resolveMaybeRelativePath(merged.statusFile, configLoad.directory ?? cwd)
    : undefined;

  return {
    ...merged,
    subscriptionType: merged.subscriptionType ?? "Plan not set",
    workingOn: merged.workingOn ?? defaultWorkingOn(cwd),
    workspace,
    statusFile,
    configFile: configLoad.filePath,
    startedAt: parseStartedAt(merged.startedAt, processStartedAt),
    updateIntervalMs: parsePositiveInteger(
      merged.updateIntervalMs,
      DEFAULT_UPDATE_INTERVAL_MS
    ),
    buttons: normalizeButtons(merged)
  };
}

export function mergeStatus(config: RpcConfig): RpcConfig {
  if (!config.statusFile || !fs.existsSync(config.statusFile)) {
    return config;
  }

  const status = readJsonFile<RawConfig>(config.statusFile);
  const merged = mergeObjects(config, status);

  return {
    ...merged,
    subscriptionType: merged.subscriptionType ?? config.subscriptionType,
    workingOn: merged.workingOn ?? config.workingOn,
    workspace: merged.workspace ?? config.workspace,
    startedAt: parseStartedAt(status.startedAt ?? config.startedAt, config.startedAt),
    updateIntervalMs: parsePositiveInteger(
      merged.updateIntervalMs,
      config.updateIntervalMs
    ),
    buttons: normalizeButtons(merged)
  };
}

export function validateConfig(config: RpcConfig): asserts config is RpcConfig & {
  clientId: string;
} {
  if (!config.clientId) {
    throw new Error(
      "Missing Discord client ID. Set DISCORD_CLIENT_ID, CODEX_DISCORD_CLIENT_ID, --client-id, or clientId in codex-rpc.config.json."
    );
  }
}

export function parseCliArgs(argv: string[]): RawConfig {
  const output: RawConfig = {};

  for (let index = 0; index < argv.length; index += 1) {
    const rawArg = argv[index];
    if (!rawArg.startsWith("--")) {
      continue;
    }

    const [rawKey, inlineValue] = rawArg.slice(2).split("=", 2);
    const key = CLI_ALIASES[rawKey];
    if (!key) {
      throw new Error(`Unknown option: --${rawKey}`);
    }

    if (key === "help" || key === "version") {
      output[key] = true;
      continue;
    }

    const nextValue = inlineValue === undefined ? argv[index + 1] : inlineValue;
    if (nextValue === undefined || nextValue.startsWith("--")) {
      throw new Error(`Missing value for --${rawKey}`);
    }

    (output as Record<string, unknown>)[key] = nextValue;
    if (inlineValue === undefined) {
      index += 1;
    }
  }

  return output;
}

export function parseStartedAt(value: unknown, fallback: Date = new Date()): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return fromEpochNumber(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return fromEpochNumber(Number(trimmed));
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function loadConfigFile(explicitFile: string | undefined, cwd: string): ConfigLoadResult {
  const candidates = explicitFile
    ? [resolveMaybeRelativePath(explicitFile, cwd)]
    : DEFAULT_CONFIG_FILES.map((fileName) => path.join(cwd, fileName));

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) {
      continue;
    }

    return {
      filePath: candidate,
      directory: path.dirname(candidate),
      config: readJsonFile<RawConfig>(candidate)
    };
  }

  if (explicitFile) {
    throw new Error(`Config file not found: ${explicitFile}`);
  }

  return { config: {} };
}

function readJsonFile<T>(filePath: string): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read JSON file ${filePath}: ${message}`);
  }
}

function readEnvConfig(env: NodeJS.ProcessEnv): RawConfig {
  const output: RawConfig = {};

  for (const [configKey, envNames] of Object.entries(ENV_MAP)) {
    const value = firstDefinedEnv(env, envNames);
    if (value !== undefined) {
      output[configKey as keyof RawConfig] = value as never;
    }
  }

  return output;
}

function firstDefinedEnv(env: NodeJS.ProcessEnv, names: string[]): string | undefined {
  for (const name of names) {
    if (env[name] !== undefined && env[name] !== "") {
      return env[name];
    }
  }

  return undefined;
}

function fromEpochNumber(value: number): Date {
  if (value < 10_000_000_000) {
    return new Date(value * 1000);
  }

  return new Date(value);
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeButtons(config: RawConfig): PresenceButton[] {
  const buttons = Array.isArray(config.buttons) ? [...config.buttons] : [];

  if (config.buttonLabel && config.buttonUrl) {
    buttons.push({
      label: config.buttonLabel,
      url: config.buttonUrl
    });
  }

  return buttons
    .filter((button): button is PresenceButton => Boolean(button?.label && button?.url))
    .slice(0, MAX_BUTTONS)
    .map((button) => ({
      label: String(button.label),
      url: String(button.url)
    }));
}

function resolveMaybeRelativePath(filePath: string, baseDirectory: string): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.resolve(baseDirectory, filePath);
}

function defaultWorkingOn(cwd: string): string {
  const directoryName = path.basename(cwd);
  return directoryName || "Codex session";
}

function mergeObjects(...objects: Array<RawConfig | undefined>): RawConfig {
  return Object.assign({}, ...objects.filter(Boolean));
}
