# Discodex

Discord Rich Presence for Codex.

Discodex shows what you are doing with Codex directly on your Discord profile:

| Discord field | Example |
| --- | --- |
| Details | `Working on: Refactoring a CLI command` |
| State | `Plan: ChatGPT Plus` |
| Timer | `00:42 elapsed` |

It is a small local TypeScript app. You run it on your machine, it connects to the Discord desktop app through Discord RPC, and it updates your activity while Codex is open.

This is an unofficial community project. It is not made by, endorsed by, or affiliated with Discord, OpenAI, or Codex.

## Why This Exists

Codex can spend a long time working through a repo, fixing tests, writing docs, or reviewing a pull request. Discodex gives that work a clean Discord presence without reading private account files or sending hidden telemetry anywhere.

The project is intentionally simple:

- You choose what text Discord shows.
- You choose what subscription or plan label Discord shows.
- Discord handles the elapsed timer.
- A local status file can update the text without restarting the app.
- Windows users can install a watcher that starts the RPC when Codex opens.

## Requirements

- Node.js 18 or newer.
- The Discord desktop app running on the same machine.
- A Discord Application ID.
- Windows PowerShell for the included Windows startup scripts.

The Discord Application ID is required by Discord Rich Presence. It is public app metadata, not a password or token. See [Discord Application Setup](docs/discord-application.md).

## Install

Clone the repository and install dependencies:

```powershell
git clone https://github.com/KharalDipendra/Discodex.git
cd Discodex
npm install
```

Build the TypeScript project:

```powershell
npm run build
```

## Quick Start

1. Create a Discord application and copy its Application ID.
2. Copy the example config:

   ```powershell
   Copy-Item examples\codex-rpc.config.example.json codex-rpc.config.json
   ```

3. Open `codex-rpc.config.json` and set:

   ```json
   {
     "clientId": "YOUR_DISCORD_APPLICATION_ID",
     "subscriptionType": "ChatGPT Plus",
     "workingOn": "Building with Codex"
   }
   ```

4. Start Discord desktop.
5. Start Discodex:

   ```powershell
   npm start
   ```

Your Discord profile should now show your Codex activity.

## One Command Windows Setup

Windows users can run the setup helper:

```powershell
npm run setup:windows
```

The setup script:

- asks for your Discord Application ID once
- writes `codex-rpc.config.json`
- installs a startup watcher
- can start the watcher immediately

To open the Discord Developer Portal during setup and start the watcher right away:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-windows.ps1 -OpenDiscordPortal -RunNow
```

## Start Automatically When Codex Opens

Install the Windows watcher:

```powershell
npm run startup:install:windows
```

The watcher starts at Windows login, waits for `Codex.exe`, runs Discodex while Codex is open, and stops the RPC when Codex closes.

Run the watcher immediately after installing:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-windows-startup.ps1 -RunNow
```

Remove the watcher:

```powershell
npm run startup:uninstall:windows
```

Watcher logs are written to `.runtime/`.

## Configuration

Discodex reads configuration in this order:

1. CLI flags
2. Environment variables
3. `codex-rpc.config.json`
4. Built-in defaults

### Config File

```json
{
  "clientId": "123456789012345678",
  "subscriptionType": "ChatGPT Plus",
  "workingOn": "Reviewing a pull request",
  "startedAt": "2026-06-24T09:00:00+12:00",
  "largeImageKey": "codex",
  "largeImageText": "Codex",
  "smallImageKey": "openai",
  "smallImageText": "Coding with Codex",
  "statusFile": "status.json",
  "buttons": [
    {
      "label": "View project",
      "url": "https://github.com/KharalDipendra/Discodex"
    }
  ]
}
```

### Environment Variables

```powershell
$env:DISCORD_CLIENT_ID="123456789012345678"
$env:CODEX_SUBSCRIPTION_TYPE="ChatGPT Plus"
$env:CODEX_WORKING_ON="Writing tests with Codex"
npm start
```

Supported variables:

| Variable | Meaning |
| --- | --- |
| `DISCORD_CLIENT_ID` | Discord Application ID |
| `CODEX_DISCORD_CLIENT_ID` | Alternative Discord Application ID |
| `CODEX_SUBSCRIPTION_TYPE` | Text shown after `Plan:` |
| `CODEX_PLAN` | Alternative plan label |
| `CODEX_WORKING_ON` | Text shown after `Working on:` |
| `CODEX_TASK` | Alternative work label |
| `CODEX_WORKSPACE` | Workspace name |
| `CODEX_STARTED_AT` | Timer start time |
| `CODEX_RPC_STATUS_FILE` | JSON file for live updates |

### CLI

```text
codex-discord-rpc --client-id <discord-app-id> [options]
```

Common options:

| Option | Meaning |
| --- | --- |
| `--client-id <id>` | Discord Application ID |
| `--subscription <name>` | Plan or subscription label |
| `--working-on <text>` | Current Codex work |
| `--started-at <time>` | ISO time, Unix seconds, or Unix milliseconds |
| `--config <path>` | Config file path |
| `--status-file <path>` | JSON file for live updates |
| `--large-image-key <key>` | Discord Rich Presence asset key |
| `--small-image-key <key>` | Discord Rich Presence asset key |
| `--button-label <text>` | Activity button label |
| `--button-url <url>` | Activity button URL |
| `--update-interval <ms>` | Status refresh interval |

## Live Updates

If `statusFile` is set, Discodex polls that file and updates Discord when the content changes.

Example `status.json`:

```json
{
  "subscriptionType": "ChatGPT Pro",
  "workingOn": "Fixing failing tests",
  "startedAt": "2026-06-24T10:15:00+12:00"
}
```

This is useful if another tool or script wants to update your Discord activity while Discodex keeps running.

## Discord Assets

If you want icons in Rich Presence, upload art assets in the Discord Developer Portal:

1. Open your Discord application.
2. Go to **Rich Presence**.
3. Upload images with keys such as `codex` and `openai`.
4. Use those keys as `largeImageKey` and `smallImageKey`.

Discord can take a few minutes to make new assets available.

## Troubleshooting

### Discord does not show anything

- Make sure the Discord desktop app is open.
- Make sure `clientId` is set.
- Make sure the Discord Application ID is copied from the correct application.
- Restart Discord after uploading new Rich Presence assets.

### `Missing Discord client ID`

Set one of these:

- `clientId` in `codex-rpc.config.json`
- `DISCORD_CLIENT_ID`
- `CODEX_DISCORD_CLIENT_ID`
- `--client-id`

### The watcher does not start

- Check `.runtime/` for watcher logs.
- Run `npm run startup:install:windows` again.
- If Task Scheduler is blocked, the installer falls back to the user Startup folder.

### Can this work without a Discord Application ID?

No. Discord Rich Presence always needs an application ID. Discodex can save it once so you do not type it every time, but Discord still requires one.

## Privacy

Discodex only uses values you provide through config, environment variables, CLI flags, or the status file.

It does not read:

- Codex auth files
- ChatGPT account files
- Discord token files
- browser profiles
- private repository contents

It does not send analytics or telemetry.

## Development

Install dependencies:

```powershell
npm install
```

Run the full local check:

```powershell
npm run build
npm test
npm run check
```

Useful scripts:

| Script | Purpose |
| --- | --- |
| `npm run dev` | Run the CLI from TypeScript source |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run unit tests |
| `npm run check` | Type-check without emitting files |
| `npm run setup:windows` | Interactive Windows setup |
| `npm run watch:windows` | Run the Codex process watcher |

Source files live in `src/`. Tests live in `test/`. Compiled files are generated into `dist/`.

## Contributing

Contributions are welcome.

Good first contributions:

- clearer setup docs
- better error messages
- more Windows watcher tests
- macOS or Linux startup examples
- improved status file integrations
- Discord asset examples

Before opening a pull request:

```powershell
npm run build
npm test
npm run check
```

Please keep changes focused and avoid adding token scraping, account scraping, or hidden telemetry.

## Project Status

Discodex is early but usable. The current focus is a reliable local Discord RPC for Codex sessions. Future work may include:

- packaged releases
- npm publishing
- richer Codex status integrations
- cross-platform startup helpers
- better examples for automated status updates

## License

MIT. See [LICENSE](LICENSE).
