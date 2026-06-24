import type { RpcConfig } from "./config";

export interface DiscordActivity {
  details: string;
  state: string;
  startTimestamp: Date;
  instance: false;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  buttons?: Array<{
    label: string;
    url: string;
  }>;
}

const DETAILS_LIMIT = 128;
const STATE_LIMIT = 128;

export function buildActivity(config: RpcConfig): DiscordActivity {
  const activity: DiscordActivity = {
    details: fitDiscordText(`Working on: ${config.workingOn}`, DETAILS_LIMIT),
    state: fitDiscordText(`Plan: ${config.subscriptionType}`, STATE_LIMIT),
    startTimestamp: config.startedAt,
    instance: false
  };

  if (config.largeImageKey) {
    activity.largeImageKey = config.largeImageKey;
  }

  if (config.largeImageText) {
    activity.largeImageText = config.largeImageText;
  }

  if (config.smallImageKey) {
    activity.smallImageKey = config.smallImageKey;
  }

  if (config.smallImageText) {
    activity.smallImageText = config.smallImageText;
  }

  if (config.buttons.length > 0) {
    activity.buttons = config.buttons;
  }

  return activity;
}

export function fitDiscordText(value: unknown, limit: number): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1)}…`;
}
