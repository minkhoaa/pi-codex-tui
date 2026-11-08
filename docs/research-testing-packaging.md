# Testing, Performance, Packaging, and Licensing Research

**Research date:** 2026-11-08  
**Verified local runtime:** Pi CLI / `@earendil-works/pi-coding-agent` 1.5.0.  
**Scope:** terminal UI comparison strategy, functional/performance measures, standard package lifecycle, and license evidence. This report records evidence and a recommended plan; no visual or performance benchmark was run here.

## Verified package and lifecycle behavior

The repository's package manifest declares a Pi package with extension `./src/index.ts` and theme glob `./themes/*.json`; it currently declares `"license": "MIT"`. The tracked working tree is initially untracked, so the inspected package and docs are pre-existing user content. No root `LICENSE` file was found in the inspected tree; the manifest field alone is metadata rather than a distributed license text. Add a license file before publishing if MIT is the intended grant.

The installed Pi 1.5.0 package documentation confirms:

- `pi install ./local-package`, git, and npm package sources are supported. `pi list` lists configured packages; `pi remove <source>` removes a package and settings entry; `pi uninstall` aliases remove.
- `pi config` enables/disables discovered package resources; resources can also be filtered to `extensions: []` or theme paths in settings. `pi -e ./path` loads an extension for one invocation without adding it to settings.
- Personal package declarations are in the Pi agent settings; project declarations are in `.pi/settings.json` and load only after project trust is granted.
- Pi's package lifecycle does not promise cleanup of arbitrary extension side effects. In this project, the existing extension changes the selected theme through `setTheme`; its own docs state that it restores a prior single-theme setting on orderly shutdown, but cannot restore an unset preference exactly or clean up after abrupt termination. Removing/disabling the extension prevents future activation; it does not itself prove the selected theme is restored.

Evidence: installed release `~/.pi/agent/install/releases/1.5.0/node_modules/@earendil-works/pi-coding-agent/docs/packages.md` and `docs/cli.md`; matching upstream [Pi package documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md), [Pi CLI documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md). Local docs are pinned to installed release 1.5.0; upstream `main` links move.

### Reversibility checks to run

Use an isolated temporary `PI_CODING_AGENT_DIR` and a local package source so global settings are not touched. Capture the initial settings and effective theme; install; list; launch native `pi`; disable only this package's extension resource and restart; remove the package; compare settings and restored UI after each step. Separately cover clean shutdown, `/reload`, session replacement, existing single theme, existing light/dark pair, absent theme key, failed `setTheme`, and simulated abrupt termination. Expected known limitation: an abrupt termination can leave the temporary theme selected because shutdown hooks cannot run. Verify that package removal leaves the extension declaration/cache handled by Pi's normal command and leaves no Pi core edits.

## Visual regression strategy

### Reproducible capture

Use a pinned Codex CLI revision and installed Pi release; record both exact version/commit, terminal emulator, font and font size, OS, locale, `TERM`, color capability, and environment. Run both applications at the same dimensions (at least a common 120x36 baseline plus narrow/wide cases) and feed a fixed scenario script with identical literal prompts/tool output. Disable animations or capture at fixed semantic events where available. Keep separate baselines for dark/light and 16/256/truecolor paths where supported.

Capture both:

1. Terminal cell state/ANSI output from a PTY or deterministic in-memory terminal screen model. Normalize volatile timestamps, cursor position, and nondeterministic identifiers only where they are not part of the target UI. Keep a raw transcript for debugging.
2. A PNG screenshot with the same emulator, font, window size and theme. Use exact pixel equality as a diagnostic when the environment is pinned; also report normalized changed-pixel ratio, per-region changed-pixel ratio, and SSIM or another documented perceptual metric to make font antialiasing differences visible. Never collapse the metrics into a subjective single “parity” score without weights and test coverage.

Keep fixtures for empty input, user/assistant exchange, multiline text, Markdown/table/code, streaming, thinking, tool running/success/error/cancel, large output, diff, session resume, and terminal resize. Each fixture should state which Pi surface is expected to differ because stock transcript geometry is not replaceable through the documented extension API. Store screenshots and comparison output under one documented artifact directory; avoid maintaining duplicate manually edited golden images.

This is a proposed method, not a claim that screenshots or image metrics already exist. The user-provided specification already requires equivalent terminal dimensions, emulator, font, color and representative content. Pi's [TUI guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md) establishes that its component API is width-aware and intended to work within Pi's native renderer; exact capture tooling remains a project choice.

## Functional parity measures

Compare the same Pi release with the extension disabled and enabled. Use a deterministic mock provider/replay fixture where available so no external model variance or credentials enter the comparison. Record and compare:

- Prompt/model request payloads, including system/developer/user messages and tool schemas; assert byte-for-byte equality for the same input/event fixture and zero extension-added messages/tools.
- Input submitted by editor: exact string and attachment references for multiline, paste, slash command, autocomplete, history, and image attachment cases.
- Tool registry names/schemas and invocation inputs; tool result content, error/cancel/approval flags, and session event sequence.
- Session file entries before/after; rendering should create no session entries. Markdown display transform output should be tested separately from stored/model-visible content.
- Pi commands, keyboard controls, model/provider settings, and extension renderer `next()` fallback behavior for unknown/custom tools.

The zero-model-overhead acceptance is directly measurable by comparing provider call count, serialized request payload, and reported input/output token counts for identical deterministic runs. An extension that only registers theme/rendering surfaces should produce no new provider request and no payload delta.

## Performance plan

Pin the machine, terminal, Pi release, Node version, fixture size, and warm/cold cache conditions. Run repeated paired enabled/disabled trials (suggest at least 30 per case after warmups) and report raw values plus median, p95, and bootstrap confidence intervals. Record startup-to-first-ready time, idle RSS, idle CPU over a fixed interval, CPU time and wall latency for streaming updates and large transcript reflow, resize-to-stable-render latency, and per-update allocations/heap delta if available. Run both small and stress fixtures; keep timing collection out of the render loop. Report token usage separately and expect exact equality. Do not claim low overhead from a single successful launch.

Suggested acceptance: zero request/tool/session/input deltas; no crash or dropped render under supported fixtures; visual renderer synchronous work remains cheap enough that p95 update and resize latencies stay within a predeclared budget on the pinned host. Define the numeric latency budget before measuring to avoid a post-hoc pass criterion. No benchmark was run for this report.

## Licensing and source attribution

Local Pi 1.5.0 package metadata declares MIT. The official Codex repository's [license notice](https://github.com/openai/codex/blob/main/docs/license.md) identifies Apache-2.0 for that repository. This project currently claims MIT in `package.json`, but this report did not find a repository `LICENSE` file. Verify the full upstream Codex license and any source-file notices for every copied asset or code fragment before redistribution. Prefer independently implemented code and factual color measurements; if source code/assets are copied, preserve required copyright, license and NOTICE material and review compatibility with the project's chosen license. Do not imply OpenAI endorsement. This is a packaging diligence finding, not legal advice.

Pi 1.5.0 package metadata links to the upstream `earendil-works/pi` repository and says MIT; its installed `package.json` also contains that license field. References: [Pi package metadata/source](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/package.json), [Codex license notice](https://github.com/openai/codex/blob/main/docs/license.md). Codex source revision has not yet been pinned by this research.

## What is verified vs pending

**Verified:** installed Pi version 1.5.0; local package manifest resource paths and MIT metadata; package and CLI docs for install/list/remove/config and per-invocation extension use; official repository license notices as linked above.

**Recommended but not executed:** terminal/PNG capture strategy, visual metrics, functional parity assertions, repeated benchmark design, and isolated lifecycle matrix.

**Pending evidence:** actual install/disable/remove run in an isolated agent directory; screenshots and visual metrics; deterministic model payload comparison; functional regression run; startup/CPU/memory/render latency benchmark; precise Codex commit/license artifact checks for copied material.
