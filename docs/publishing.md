# Publishing

These steps are for maintainers preparing the first public GitHub release.

## Create the GitHub Repository

```powershell
git init -b main
git add .
git commit -m "Initial commit"
gh repo create codex-discord-rpc --public --source=. --push
```

If the repository already exists:

```powershell
git remote add origin https://github.com/YOUR_NAME/codex-discord-rpc.git
git push -u origin main
```

## Release Checklist

- Run `npm run build`.
- Run `npm test`.
- Run `npm run check`.
- Confirm `README.md` has the right GitHub links.
- Confirm `package.json` has the right package name and repository metadata if publishing to npm.
- Tag the release:

  ```powershell
  git tag v0.1.0
  git push origin v0.1.0
  ```

## npm Dry Run

```powershell
npm pack --dry-run
```

The package should include `dist/`, `docs/`, `examples/`, `scripts/`, `README.md`, and `LICENSE`.
