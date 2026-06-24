# Discord Application Setup

Discord Rich Presence needs a Discord application client ID. This project does not ship with a shared client ID because open-source users should control their own app name, icon, and assets.

## Create the Application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select **New Application**.
3. Name it something like `Codex RPC`.
4. Copy the **Application ID** from the General Information page.
5. Use that value as `clientId` or `DISCORD_CLIENT_ID`.

## Add Rich Presence Assets

To show icons, open **Rich Presence > Art Assets** in the Developer Portal and upload images with these keys:

- `codex`
- `openai`

The keys must match `largeImageKey` and `smallImageKey` in your config. Discord can take a few minutes to make new assets available.

## Local Test

Start Discord desktop, then run:

```powershell
$env:DISCORD_CLIENT_ID="your_application_id"
$env:CODEX_SUBSCRIPTION_TYPE="ChatGPT Plus"
$env:CODEX_WORKING_ON="Testing Codex Discord RPC"
npm start
```

Your Discord profile should show:

- `Working on: Testing Codex Discord RPC`
- `Plan: ChatGPT Plus`
- an elapsed timer

## Why an Application ID Is Required

Discord Rich Presence is attached to a Discord application. The application ID tells Discord which app name and uploaded art assets to show. It is public metadata, not a secret.

For fully automatic startup, save the ID once with:

```powershell
npm run setup:windows
```
