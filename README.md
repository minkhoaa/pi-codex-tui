# pi-codex-tui

A presentation-only extension for native Pi, using the official Codex CLI as its visual reference. Pi's agent, prompts, tools, sessions, and execution behavior remain native.

## Install

```bash
pi install git:github.com/OWNER/pi-codex-tui
```

Replace `OWNER` with the GitHub account or organization that hosts this repository. For a local checkout, use `pi install ./`.

On interactive session start, the extension selects its Codex-inspired dark or light Pi theme based on the current theme appearance. On orderly exit, reload, or session replacement, it restores the previous single-theme setting. If the existing setting is an automatic light/dark pair, it leaves that setting alone because Pi's public `setTheme()` API cannot select or restore a pair. An abrupt process termination can leave the temporary theme selected; the extension cannot guarantee exact restoration after a crash because Pi's public theme setter persists the selection.

## Current scope

- Dark and light Pi themes based on source-inspected Codex colors and Pi's theme schema.
- A presentation-only lifecycle hook that selects a theme through Pi's public UI API and restores the prior supported single theme on orderly shutdown.
- A conservative custom editor wrapper that hides the stock horizontal composer rules when they are not carrying a working or overflow indicator; Pi retains input handling, cursor, selection, autocomplete, and attachments.
- No tools, prompts, input transforms, provider hooks, or session data are added or changed.
- Pi keeps ownership of transcript rows, viewport, wrapping, streaming and tool execution. The extension cannot reproduce Codex's full user-message geometry or transcript layout through documented Pi APIs; those differences are recorded in [docs/capability-matrix.md](docs/capability-matrix.md).

The verified runtime baseline is Pi 1.5.0 and Codex CLI 0.167.0. Research reports, API feasibility, proof results, and remaining verification are in [docs/capability-matrix.md](docs/capability-matrix.md). The project does not use private Pi hooks or core patches to fill API gaps.

## Compatibility

Pi 1.5.0 is the currently verified release. Other Pi versions are unverified; re-run type and native TUI smoke checks when updating the Pi baseline. Codex is a visual reference only and is not a runtime dependency.

## Disable and remove

Stop the Pi session before removing the package so its shutdown handler can restore the prior theme:

```bash
pi remove git:github.com/OWNER/pi-codex-tui
```

To disable only its extension resource while keeping the package's theme files installed, use `pi config` or set that package's `extensions` filter to `[]`. Removing the package prevents it from loading in later sessions. Abrupt termination is the known restoration limitation described above.
