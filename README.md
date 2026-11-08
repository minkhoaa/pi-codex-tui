# pi-codex-tui

A presentation-only extension for native Pi, using the official Codex CLI as its visual reference. Pi's agent, prompts, tools, sessions, and execution behavior remain native.

## Install

```bash
pi install git:github.com/minkhoaa/pi-codex-tui
```

For a local checkout, use `pi install ./`.

In an interactive TUI session, the extension selects its Codex-inspired dark or light theme only when Pi has no theme preference or is using `system`. It preserves an explicitly selected theme, including `--use-theme` and a light/dark pair. The public `setTheme()` API persists its selection, so an orderly shutdown restores the previous setting. When that setting was absent, Pi's API can restore only `system`; it cannot remove the key. Abrupt termination can leave the Codex theme selected.

## Current scope

- Dark and light Pi themes based on source-inspected Codex colors and Pi's theme schema.
- A presentation-only lifecycle hook that selects a theme through Pi's public UI API and restores the prior supported setting on orderly shutdown.
- A conservative custom editor wrapper that hides the stock horizontal composer rules when they are not carrying a working or overflow indicator; Pi retains input handling, cursor, selection, autocomplete, and attachments.
- A responsive footer showing model, thinking level, context percentage, Git branch, and extension statuses. The public footer setter is a singleton replacement point, so a third-party custom footer cannot be composed or restored through the documented API.
- Native Pi Markdown, streaming, tool and diff renderers styled through theme tokens. Their execution, expansion, image, truncation and error behavior stays native.
- No tools, prompts, input transforms, provider hooks, or session data are added or changed.
- Pi keeps ownership of transcript rows, viewport, wrapping, streaming, header and tool execution. The extension cannot reproduce Codex's full user-message geometry or transcript layout through documented Pi APIs; those differences are recorded in [docs/capability-matrix.md](docs/capability-matrix.md).

The verified runtime baseline is Pi 1.5.0 and Codex CLI 0.167.0. Research reports, API feasibility, proof results, and remaining verification are in [docs/capability-matrix.md](docs/capability-matrix.md). The project does not use private Pi hooks or core patches to fill API gaps.

## Verify

Run the local package and API checks with:

```bash
npm test
node --check scripts/capture-tui.mjs
```

The tests validate package resources, theme schema and visual-only source invariants. A runtime smoke can be captured in an isolated Pi agent directory with `scripts/capture-tui.mjs`; it does not contact a model when Pi is launched with `--offline`.

## Compatibility

Pi 1.5.0 is the currently verified release. Other Pi versions are unverified; re-run type and native TUI smoke checks when updating the Pi baseline. Codex is a visual reference only and is not a runtime dependency.

## Disable and remove

Stop the Pi session before removing the package so its shutdown handler can restore the prior theme:

```bash
pi remove git:github.com/minkhoaa/pi-codex-tui
```

To disable only its extension resource while keeping the package's theme files installed, use `pi config` or set that package's `extensions` filter to `[]`. Removing the package prevents it from loading in later sessions. Abrupt termination is the known restoration limitation described above.
