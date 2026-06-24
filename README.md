# Codex Discord RPC

Discord Rich Presence for Codex sessions. Show your subscription type, what Codex is working on, and how long the session has been running.

This is an unofficial community project and is not affiliated with Discord, OpenAI, or Codex.

## Features

- Shows `Working on: ...` in Discord Rich Presence.
- Shows `Plan: ...` for your Codex or ChatGPT subscription type.
- Uses Discord's elapsed timer from `startedAt` so friends can see how long you have been working.
- Supports JSON config, environment variables, CLI flags, and a live status file.
- Keeps secrets out of the app: it does not read Codex auth files or scrape account data.
- Written in TypeScript with a compiled CLI output.

## Requirements

- Node.js 18 or newer.
- Discord desktop app running on the same machine.
- A Discord application client ID.

## Quick Start

1. Create a Discord application and copy its client ID. See [docs/discord-application.md](docs/discord-application.md).
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create a local config from the example:

   ```powershell
   Copy-Item examples\codex-rpc.config.example.json codex-rpc.config.json
   ```

4. Edit `codex-rpc.config.json` and set your `clientId`, `subscriptionType`, and `workingOn`.
5. Start the RPC daemon:

   ```powershell
   npm start
   ```

You can also run it entirely from environment variables:

```powershell
$env:DISCORD_CLIENT_ID="123456789012345678"
$env:CODEX_SUBSCRIPTION_TYPE="ChatGPT Plus"
$env:CODEX_WORKING_ON="Making a Discord RPC for Codex"
npm start
```

## Configuration

Config precedence is:

1. CLI flags
2. Environment variables
3. `codex-rpc.config.json`
4. Built-in defaults

Example:

```json
{
  "clientId": "123456789012345678",
  "subscriptionType": "ChatGPT Plus",
  "workingOn": "Building a Discord RPC for Codex",
  "startedAt": "2026-06-24T09:00:00+12:00",
  "largeImageKey": "codex",
  "largeImageText": "Codex",
  "statusFile": "status.json"
}
```

`startedAt` controls the elapsed timer in Discord. If you leave it out, the timer starts when the daemon starts.

## Live Updates

Set `statusFile` to a JSON file and the daemon will poll it every 15 seconds:

```json
{
  "subscriptionType": "ChatGPT Pro",
  "workingOn": "Refactoring a CLI command",
  "startedAt": "2026-06-24T10:15:00+12:00"
}
```

This makes it easy for another script, overlay, or Codex workflow to update the visible activity without restarting Discord RPC.

## Start When Codex Opens

On Windows, run the one-time setup:

```powershell
npm run setup:windows
```

Discord requires a Discord Application ID for Rich Presence. The setup script asks for it once, saves it to `codex-rpc.config.json`, and installs the startup watcher. The ID is not a token or password.

To open the Discord Developer Portal during setup:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-windows.ps1 -OpenDiscordPortal -RunNow
```

If you already have `codex-rpc.config.json`, you can install only the background watcher:

```powershell
npm run startup:install:windows
```

The watcher starts at Windows logon, waits for `Codex.exe`, starts the Discord RPC while Codex is open, and stops it when Codex closes. It tries to use Task Scheduler first and falls back to your user Startup folder if Windows blocks scheduled task creation.

Run it immediately after installing:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows-startup.ps1 -RunNow
```

Remove it:

```powershell
npm run startup:uninstall:windows
```

Watcher logs are written to `.runtime/`.

## CLI

```text
codex-discord-rpc --client-id <discord-app-id> [options]
```

Common options:

- `--subscription <name>`
- `--working-on <text>`
- `--started-at <time>`
- `--config <path>`
- `--status-file <path>`
- `--large-image-key <key>`
- `--small-image-key <key>`
- `--button-label <text>`
- `--button-url <url>`

## Development

```powershell
npm install
npm run build
npm test
npm run check
```

The source lives in `src/`, tests live in `test/`, and the compiled CLI is emitted to `dist/`.

## Publishing

For first-time GitHub setup and release notes, see [docs/publishing.md](docs/publishing.md).

## Privacy

The app only uses the values you provide through config, environment variables, CLI flags, or the status file. It does not read OpenAI, ChatGPT, Codex, browser, or Discord token files.

## License

MIT. See [LICENSE](LICENSE).
