# Codex TUI Fidelity: API Capability Matrix

**Status:** research baseline, 2026-11-08  
**Local Pi CLI:** 1.5.0 (`pi --version`)  
**Upstream references:** current `main` branches; these are moving targets, so implementation must record the Pi version it is verified against.

## Research questions

1. Which visible Codex components and style rules are implemented in official Codex TUI source?
2. Which Pi public extension APIs can affect the corresponding surfaces?
3. Can the UI be changed without changing submitted content, agent events, tools, or session data?
4. Which differences require unsupported transcript/layout hooks or terminal-specific behavior?
5. Can the package activate and remove its presentation without persistent Pi core/config changes?

## Findings

Pi documents public extension APIs for custom themes, Markdown display transformers, generic tool renderers, custom header and footer factories, and a `CustomEditor` base class that preserves application keybindings. Its TUI guidance says extensions should use the existing component system and not create another terminal renderer. This is a strong surface for theme, composer, footer, header, tool and Markdown work. [Pi extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), [Pi TUI API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md)

Pi’s Markdown transformer is explicitly display-only: the original message stays unchanged in session/model context. It is run for normal user, assistant and thinking Markdown, including streaming and restored messages, and should be synchronous and inexpensive. [Pi extension API, Markdown transformers](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)

Codex’s visual style is partly terminal-relative rather than a fixed palette. Its source computes user-message fill by blending white at 12% over a dark terminal background or black at 4% over a light one. It uses `#63A8F8` as the shared UI accent before contrast/color-depth adaptation, with `#1C64C8` preferred on light backgrounds. Therefore a static Pi theme can approximate Codex, but exact color matching across arbitrary terminal backgrounds and color depths needs runtime color adaptation that Pi’s theme file alone does not establish. [Codex TUI style implementation](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs)

Codex’s transcript is built from dedicated history cells and an in-flight active cell, with streaming updates and an independently synchronized transcript overlay. This is substantially more than message Markdown. Pi’s public docs describe Markdown transforms and custom renderers for extension-defined message types; they do not document an extension hook that replaces the built-in user/assistant transcript row renderer or controls the transcript viewport. Treat full row geometry, grouping, live tool cells, and viewport behavior as unproven or unavailable until an executable public-API proof shows otherwise. [Codex chat widget](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget.rs), [Pi extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)

Pi themes include message, tool, diff, Markdown, editor and selection color roles. Pi packages can ship themes and extensions together. In the installed Pi 1.5.0 declarations, `ctx.ui.setTheme()` accepts one name or a Theme object; it writes through the settings manager. A single-theme selection can be restored on orderly `session_shutdown`, and the local runtime check below confirms this for the `system` theme. Pi's saved light/dark pair syntax is not accepted by `setTheme()`, so the extension leaves a pre-existing pair untouched. Abrupt termination cannot run the cleanup hook, and an unset theme preference restores as explicit `system`; these are known reversibility limits. The CLI separately exposes `--use-theme` for one invocation, but requiring that flag would not satisfy the unchanged `pi` launch command. [Pi theme schema](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/interactive/theme/theme-schema.json), [Pi package format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md)

Zentui's source demonstrates native `CustomEditor` composition, tool renderer registration, header/footer replacements, and user-message styling. Its current extension also contains a prototype patch registry and files named `accent-rail-layout-patch.ts`; those techniques are outside this project's no-private-hooks constraint and must not be copied. Use Zentui only for its standard package and public extension API patterns. [Zentui extension](https://github.com/lmilojevicc/pi-zentui/blob/main/extensions/zentui/index.ts), [Zentui patch registry](https://github.com/lmilojevicc/pi-zentui/blob/main/extensions/zentui/prototype-patch-registry.ts), [Zentui repository](https://github.com/lmilojevicc/pi-zentui)

## Capability matrix

| Component | Codex reference | Pi public surface | Feasibility | Current limitation / next evidence |
|---|---|---|---|---|
| Theme and colors | Codex `style.rs`; `styles.md` | Package theme JSON; `ctx.ui.setTheme()` | **High, with approximation** | Codex derives fills/accent against terminal background and color depth; Pi theme tokens are discrete roles. Compare dark/light and ANSI/256/truecolor output. |
| User messages | `user_message_style_for`, history prompt styles | `userMessageBg`/`userMessageText`; Markdown display transformer | **Partial** | Theme can color the native user row; no public hook found for Codex padding, width, alignment, grouping, or row geometry. Markdown transformation must preserve structured/attached content. |
| Assistant messages | Codex Markdown/history-cell rendering in `chatwidget.rs` | Markdown display transformer and theme Markdown tokens | **Partial** | Can style Markdown content without changing the original string; cannot replace the built-in row/layout through documented API. |
| Thinking/progress | `chatwidget.rs`, status/active-cell presentation | Markdown transform for thinking; hidden-thinking label and working-indicator APIs | **Partial** | Must verify streaming lifecycle, timing, and completed state. No evidence yet for replacing all transcript activity cells. |
| Tool calls/results | Codex active cells/history cells | `registerToolRenderer()` resolver, tool result/call custom renderers | **High, with compatibility checks** | Must preserve unknown tools, approval/error/cancel semantics, expand/collapse behavior, and extension ordering. Compare actual built-in tools and resumed-session calls. |
| Diffs | Codex diff and history cell rendering | Theme `toolDiff*` tokens; tool renderers | **Partial to high** | Color tokens exist; per-file layout, truncation, and diff interaction parity need source/API proof and screenshots. |
| Input editor | Codex `bottom_pane/chat_composer.rs` | `CustomEditor` factory and `ctx.ui.setEditorComponent()` | **High, with preservation tests** | `CustomEditor` preserves app controls, but custom styling must compose with existing editor factories and retain IME, paste, autocomplete, attachments, selection, and resize behavior. |
| Header/footer | Codex app/status surfaces | `setHeader()`, `setFooter()`, status/title APIs | **High, with state mapping** | Need map Pi model/context/git data to Codex equivalents; replacing footer can hide useful extension statuses unless intentionally rendered. |
| Layout/viewport/scroll | Codex owned transcript, reflow, scrollback, resize | Native Pi viewport; custom TUI components for owned screens | **Low / unproven** | No documented extension API for replacing the interactive transcript viewport or its normal message layout. Do not use private hooks. |
| Installation/removal | Native Codex CLI presentation | Standard Pi package manifest and resources | **High** | `pi install ./` and normal `pi` loading were verified with isolated settings. Git remote install and removal still need a network-backed check. |

## Invariants for implementation

- Register only rendering/resource APIs. Do not hook input, prompt, context, provider, tool execution, compaction, or session mutation events.
- A visual transformer may return alternate display Markdown, but must not mutate the original message or create a replacement model-visible message.
- Tool renderers may change presentation only; keep invocation parameters, tool results, error flags, approval flow and expansion behavior intact.
- Extend/wrap `CustomEditor` and delegate unhandled input to Pi's base implementation.
- Do not patch Pi core, installed packages, or private runtime state.
- Mark a component as verified only after current-source inspection and a reproducible runtime/screenshot check.

## Open work

- [ ] Pin Codex and Pi source revisions used for a screenshot baseline.
- [ ] Inspect Codex user-message/history-cell and composer style/layout at the actual render call sites.
- [ ] Inspect Pi implementation/types for theme selection persistence, renderer composition/order, and editor wrapping.
- [ ] Inspect Zentui's current implementation, package manifest, compatibility policy, and tests at source level.
- [ ] Obtain equivalent terminal screenshots and test dark/light, truecolor/256-color, streaming, tools, resize, resume, and attachments.
- [x] Build a minimal standard package using public APIs and verify theme activation/restoration in local Pi with temporary writable agent state.
- [ ] Measure functional parity, model-visible context, and rendering overhead.

## Local runtime inspection

- Pi CLI 1.5.0 is installed. Its type declarations expose the APIs listed above, including `CustomEditor`, `registerMarkdownTransformer`, `registerToolRenderer`, `ctx.ui.setHeader()`, `ctx.ui.setFooter()`, and `ctx.ui.setTheme()`.
- The package manifest and theme JSON files parse. Pi 1.5.0 loaded the local package and applied `codex-tui-dark` in an interactive session; the `session_shutdown` handler restored the previous `system` theme setting after clean exit.
- `ctx.ui.setTheme()` updates the settings manager in this installed build, so theme changes are persisted. The extension skips activation if the saved setting is a light/dark pair. It restores `system` if that was the effective prior setting; Pi's public API does not expose a way to remove an originally absent theme key.
- `pi --help` works with an isolated writable agent directory (`PI_CODING_AGENT_DIR=/tmp/pi-codex-agent`), avoiding writes to the read-only home configuration. The CLI reports `--use-theme <name[/name]>` for invocation-scoped theme selection and confirms package install/remove commands.
- An isolated temporary extension rendered a custom header/footer, instantiated and rendered a `CustomEditor` wrapper, and restored the built-in factories on orderly shutdown. An isolated package test installed/listed the local package, launched Pi with the documented package `extensions: []` filter, removed it, and verified an empty packages setting. The integrated package also launched in Pi 1.5.0 at 80x24 through the new capture helper. The local environment has no configured Pi model; optional `fd`/`ripgrep` helper downloads were skipped in offline mode.
- `node --check scripts/capture-tui.mjs`, its `--help`, and a TypeScript 7.0.2 no-emit strict check of `src/index.ts` and `src/ui.ts` using the installed Pi 1.5.0 declarations passed. No lint, build, or unit-test command is configured in the package.
- Codex CLI 0.167.0 was captured at 80x24 with a fresh isolated `CODEX_HOME`; it showed first-run sign-in, not the conversation UI. The raw ANSI output remains at `/tmp/codex-0.167.0-login.ansi` for this session and is not treated as a visual parity baseline. No pixel/cell comparison, authenticated conversation fixture, functional parity run, or performance benchmark has been completed.

## Consolidated feasibility gate

**Baseline:** Pi CLI `1.5.0`; Codex CLI `0.167.0`. The installed Codex release maps to source commit [`086ccc833bc9cf01024ad2dd6af7dbd421b6bf9a`](https://github.com/openai/codex/commit/086ccc833bc9cf01024ad2dd6af7dbd421b6bf9a), tag `rust-v0.167.0`. Pi findings below are verified against the installed 1.5.0 release. The visual-forensics handoff inspected moving `main` links, so claims used for pixel/cell acceptance still need to be rechecked against the pinned Codex revision. Six Phase 1 research reports preserve scope-level evidence and uncertainty:

- [Codex visual forensics](research-codex-visual.md)
- [Pi extension API feasibility](research-pi-api.md)
- [Messages and streaming](research-messages-streaming.md)
- [Editor and layout](research-editor-layout.md)
- [Tools and compatibility](research-tools-compat.md)
- [Testing, performance, packaging, and licensing](research-testing-packaging.md)

### Verified capability matrix

| Component | Classification | Documented Pi surface | Verified boundary / remaining proof |
|---|---|---|---|
| Theme palette and semantic colors | `SUPPORTED` for tokens; `PARTIAL` for exact Codex color adaptation | Package theme JSON, theme schema, `ctx.ui.setTheme()` | Theme files parse and local Pi 1.5.0 applied/restored a single theme in an earlier runtime check. Success/addition use ANSI green (`2`), error/deletion ANSI red (`1`), and warning ANSI yellow (`3`) on dark themes or terminal default on light themes. Codex blends some fills with terminal background and color depth; static themes cannot establish exact parity. |
| User/assistant Markdown content | `SUPPORTED` through native renderer; `PARTIAL` for Codex appearance | Native Pi Markdown and theme tokens; optional display transformer not registered | Pi native renderer owns wrapping/streaming/restore/resize; this package leaves text and structured image attachments untouched. No outer-row geometry hook exists. |
| User row geometry, grouping, alignment, padding | `BLOCKED` under public API constraint | Theme content colors; Markdown transform affects content only | No documented built-in transcript row replacement hook. A different geometry requires private internals or a second renderer, both forbidden. |
| Assistant and thinking row/activity layout | `NATIVE FALLBACK`; `BLOCKED` for Codex row ownership | Pi's built-in Markdown and thinking/progress UI | Built-in interactive mode owns streaming cells and viewport. This package does not transform thinking text or replace transient/completed activity cells. |
| Tool calls and results | `SUPPORTED` for targeted rendering; `PARTIAL` for full Codex parity | Composable `registerToolRenderer()` with `next()` and execution/result context | Pi owns execution, approval/cancellation, expansion and image lifecycle. Theme-only first; any targeted renderer must preserve native fallthrough and unknown/custom tools. Live renderer/approval/error/expand proof remains. |
| Diffs | `SUPPORTED` for semantic colors; `PARTIAL` for layout | Theme diff roles; tool renderer | Native renderer should remain for per-file detail and interaction. No evidence for Codex grouping/truncation parity yet. |
| Editor/composer | `SUPPORTED` for conservative border styling; `PARTIAL` for exact geometry and full input parity | `CustomEditor`, `setEditorComponent()`, native keybindings | Implemented wrapper hides horizontal rules when not conveying status/overflow and delegates all input to Pi. Runtime factory/render path passed; paste, history, autocomplete, multiline, attachments, IME, resize, and editor-extension coexistence still need regression tests. |
| Header/footer/status | `PARTIAL` | `setFooter()`, `setStatus()`, working indicator; header API unused | Custom footer retains branch and extension status values plus model/thinking/context. Header stays native because there is no getter/composition surface. Existing third-party footer composition/restoration is unavailable. |
| Transcript viewport, scroll and global layout | `BLOCKED` under documented extension APIs | No replacement API found; custom components only own their surfaces | Pi interactive mode owns its `ScrollView`, history container and viewport. Preserve that native geometry and describe it as a measured deviation. |
| Package install/disable/remove | `SUPPORTED` | Standard Pi package resources and CLI lifecycle commands | Local install/list/launch, resource disable and package removal were exercised in temporary agent directories. Abrupt-exit restoration remains impossible through the public theme lifecycle. |
| No model/context/input changes | `SUPPORTED` for theme/display APIs only | Theme + Markdown display transform + renderers; no prompt/input/event hooks | Markdown guarantee explicitly preserves original message. Acceptance still requires comparing identical serialized requests, tools, input and session events. |

### Component architecture

```text
Native Pi interactive process (unmodified)
  └─ Pi extension/resource loader
      └─ pi-codex-tui (presentation resources only)
          ├─ Codex-derived dark/light theme tokens
          ├─ CustomEditor border styling when no other editor factory is installed
          ├─ Footer component using Pi TUI primitives (header remains native)
          └─ Native tool renderers styled through theme tokens
      └─ Pi-owned transcript rows, viewport, editor behavior, tool execution and session/model data
```

No new application framework, prompt or tool is needed. Renderer callbacks stay synchronous and inexpensive. The editor is left untouched when another factory is already installed; the header remains native; and built-in tool renderers continue unchanged. The custom footer is the one singleton replacement point and cannot preserve a pre-existing third-party factory because Pi exposes no getter. Theme tokens are shared by the supported surfaces. Transcript geometry and viewport work is excluded because the documented API boundary blocks it.

### API compatibility assessment and architecture decision

The verified extension surface is broad enough for a **partial, native visual extension** but not a replacement Codex transcript. The architecture is accepted for the supported subset only: keep Pi's built-in transcript/viewport/tool lifecycle; style semantic roles; avoid mutating message strings by default; wrap existing editor behavior; delegate unhandled tools and components. No full-parity claim is permitted. The `CustomEditor`/theme startup proof already recorded above validates theme lifecycle only; editor, renderer ordering, screenshots and behavioral parity are still `UNVERIFIED` until exercised.

### Unsupported requirements and explicit fallbacks

- Codex's solid user-message row shape, exact width/alignment/padding/grouping: keep native Pi row geometry and use available theme colors.
- Codex's transcript-wide spacing, assistant cells, tool cells and viewport/scroll policy: retain Pi native layout.
- Exact background-adaptive colors across arbitrary terminals: ship measured dark/light static tokens and state the color-depth/background difference.
- Exact composer allocation/geometry: style the editor surface only; preserve Pi key handling and attachments.
- Exact status/footer model/context equivalence: render only data Pi exposes, retain existing statuses, and omit unavailable Codex-only state.
- Every built-in/custom tool's Codex summary: preserve Pi renderer unless a targeted, evidence-backed rendering change has a native fallback.

### Prioritized implementation backlog after proof gate

1. **P0 implementation:** keep package and resources within Pi's standard package lifecycle; runtime verification below covers install/list/launch/disable/remove in isolated settings.
2. **P1 implemented:** ship dark/light semantic tokens, conservative editor framing, and a status-preserving footer. Native Markdown and tool renderers handle content and execution states.
3. **P1 blocked/partial:** exact Codex user/assistant row geometry, transcript viewport, and header replacement remain unavailable or unsafe to compose through the documented API.
4. **P1 unverified:** no equivalent authenticated Codex/Pi screenshots, fixture parity comparison, or pixel/cell metric exists.
5. **P2 unverified:** shortcut, autocomplete, attachment, session, subagent, serialized request, extension-order, and performance suites remain outstanding.

### Dependency graph

```text
Pin upstream revisions + capture source fixtures
        ├─ theme token review ───────────────────────┐
        ├─ editor wrapping proof → editor styling ───┤
        ├─ native tool fallback (no override) ────────┤→ integration → regression/benchmark report
        └─ native transcript limitation documented ──┘
```

Editor and tool proofs are independent. Theme review can proceed in parallel with both. Integration follows all chosen branches; regression and benchmark results depend on the integrated package and pinned reference environment.

### Test and benchmark strategy

- **Visual:** capture the local Codex CLI and native Pi at matching terminal/font/theme settings after rechecking source call sites at the pinned Codex revision. The dependency-free PTY capture helper is in `scripts/capture-tui.mjs`; it records ANSI output at chosen dimensions. A raw Codex 80x24 capture reached first-run sign-in in an isolated home and is not comparable to Pi's normal chat; no paired screenshot or visual metric is claimed. Next capture requires an authenticated Codex session and deterministic Pi content, then record changed-cell/pixel ratios by component/region plus a perceptual metric.
- **Functional:** compare enabled/disabled Pi on the same deterministic fixture. Assert identical provider payload and tool schemas, exact submitted text/attachment references, unchanged tool invocation/results/error flags, unchanged session event sequence, and no added messages/tools. Exercise shortcuts, history, autocomplete, paste, IME where available, images, custom tools/subagents, expansion, approvals and cancellation.
- **Performance:** paired enabled/disabled runs on pinned Pi/Node/host/terminal, warm-up then repeated runs; record startup readiness, idle RSS/CPU, streaming update and large transcript reflow cost, resize-to-stable latency, median/p95 and confidence intervals. Declare budgets before measuring and keep instrumentation outside render callbacks.
- **Lifecycle:** isolated `PI_CODING_AGENT_DIR`; verify install/list, standard `pi` launch, extension-resource disable, package removal, clean shutdown/reload/session replacement, previous single theme, paired theme, absent preference and abrupt exit. Document that `setTheme()` cannot exactly restore an absent key or recover after abrupt termination.

### Gate status (before integrated implementation)

**Source-evidence gate: passed for architecture of the supported subset.** Phase 1 found documented Pi APIs and exact boundaries; all six assigned reports are present above. A temporary Pi 1.5.0 TUI proof exercised a wrapped `CustomEditor` factory, its render path, custom header/footer factories, and orderly restoration of the built-in factories. It added no prompts, tools, input changes, or model calls. An isolated `PI_CODING_AGENT_DIR` package proof installed and listed `./`, disabled the package's extension resource with the documented `extensions: []` filter, launched Pi without loading that resource, then removed the package and observed an empty package list/settings array. These checks close the chosen theme/editor/header/footer and install/disable/remove feasibility gates. They do not verify editor keystroke/IME/attachment parity, renderer execution, extension-order coexistence, or Codex visual parity.

**Implementation gate: passed for the documented safe subset.** Full transcript layout and viewport requirements remain `BLOCKED`; tool renderers are excluded until targeted value justifies their compatibility cost. The integrated package now applies theme tokens and a border-only `CustomEditor` wrapper. The wrapper was exercised in an isolated TUI proof; no keystroke, paste, image, IME, or resize parity suite has run. No reference screenshot comparison is claimed: isolated Codex 0.167.0 stopped at first-run sign-in, so its startup screen is not a comparable conversation fixture. Theme clean-shutdown restoration was exercised in the original local runtime check; abrupt termination can leave the selected theme setting behind.

### Integrated implementation status (2026-11-08)

The following describes the current repository implementation and supersedes the pre-integration status above where they differ.

| Area | Current status | Evidence / limitation |
|---|---|---|
| Theme and semantic tool/diff colors | `IMPLEMENTED`, visual match `UNVERIFIED` | Dark/light theme JSON uses Codex-derived accents and semantic colors; primary text uses Pi's terminal-default foreground. Static user fills still approximate terminal-relative blending. |
| Composer/editor | `IMPLEMENTED`, input parity `UNVERIFIED` | `src/ui.ts` installs a `CustomEditor` only if no other editor factory is already configured. It suppresses idle borders and leaves Pi's native key, autocomplete, paste and attachment code in control. |
| Footer | `IMPLEMENTED`, extension-order compatibility `PARTIAL` | `src/layout.ts` displays model, thinking level, context percentage, branch and sanitized extension statuses. The public API exposes no getter for an existing custom footer; cleanup restores Pi's default footer, so a third-party custom footer cannot be composed or restored. |
| Header | `NATIVE FALLBACK` | Kept as Pi provides it because the public API has no getter/composition mechanism for an existing header. |
| Markdown, assistant/user messages, thinking and streaming | `NATIVE FALLBACK` | No transformer is registered: Pi's native Markdown renderer already handles display, wrapping, streaming, restore and resize. The extension leaves message text, structured attachments and activity layout alone. |
| Tool calls, results and diffs | `NATIVE RENDERERS + THEME` | No custom resolver is registered. Pi's specialized built-in renderers retain arguments, result details, expansion, truncation, images, errors and diff layout while consuming the package theme's semantic colors. |
| Transcript rows, grouping, spacing, viewport and scroll | `BLOCKED` | No documented extension surface owns these built-in components; native Pi geometry remains. |
| Model/context/request behavior | `SOURCE CHECKED`, runtime payload parity `UNVERIFIED` | Extension source registers no prompts, tools, providers, input transforms, Markdown transformers or behavior/session event handlers. Deterministic request payload comparison was not available. |
| Package lifecycle | `VERIFIED` for local resource lifecycle | Local `pi install ./`, `pi list`, normal TUI startup, `extensions: []` disable, and `pi remove ./` were exercised using temporary agent directories. Clean shutdown restored an absent preference to `system`; explicit `dark` and `--use-theme light` selections were preserved. |
| Automated checks | `PARTIAL` | `npm test` validates package resources, theme schema and source-level visual-only invariants. Strict TypeScript 7.0.2 no-emit compilation of all `src/*.ts` against installed Pi 1.5.0 declarations passes. The capture helper passes syntax and help checks. No lint or build script exists; the extension runs as TypeScript through Pi. |
| Visual comparison | `UNVERIFIED` | The integrated Pi TUI rendered under PTY at 80x24. The available Codex 0.167.0 capture is first-run sign-in, not a comparable chat; no paired screenshot/cell metric or fidelity percentage is defensible. |
| Performance | `UNVERIFIED` | No repeated startup, CPU, memory, render or resize benchmark was run. No provider was configured, so the smoke did not make a model request. |

The Codex theme is selected only when Pi's saved preference is unset/`system` or already selects the matching bundled Codex theme, and the active theme is `system` or that matching theme. A different explicit single theme, `--use-theme` override, and a saved light/dark pair are preserved. Pi's public setter persists settings and cannot remove an originally absent key; a clean shutdown restores the effective prior `system` theme, but an abrupt termination may leave the Codex theme selected. If a user explicitly changes the theme during the session, shutdown does not overwrite that later selection.

The plugin has no build or lint configuration because Pi loads the TypeScript extension directly. Run `npm test`, `node --check scripts/capture-tui.mjs`, and the Pi 1.5.0 strict typecheck for the supported static checks. Equivalent authenticated Codex/Pi fixtures, screenshot/cell metrics, functional input/tool/session parity, extension coexistence, and performance measurements remain required before any claim of production parity.
