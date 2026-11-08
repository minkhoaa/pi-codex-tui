# Pi Extension API Feasibility Research

**Research date:** 2026-11-08  
**Installed runtime:** Pi CLI 1.5.0 (`@earendil-works/pi-coding-agent` 1.5.0)  
**Evidence inspected:** installed release package docs and declaration files under `~/.pi/agent/install/releases/1.5.0/node_modules/@earendil-works/pi-coding-agent`. Its package metadata identifies the upstream repository as `earendil-works/pi`, `packages/coding-agent`. The installed package has no Git commit identifier, so findings are pinned to release 1.5.0, not a commit.  
**Upstream references:** [Extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), [TUI API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md), [Theme guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/themes.md), [theme schema](https://pi.dev/schemas/theme.schema.json). `main` links move; use the installed release evidence above for reproducibility.

## Findings

Pi 1.5.0 exposes package themes, Markdown display transformers, tool-renderer resolvers, custom header/footer factories, editor factories, status and working-indicator APIs. Those allow broad presentation changes within Pi's native TUI. The TUI guide explicitly recommends using the active TUI components and says extensions should not create a second terminal renderer.

The key boundary is the transcript. The Markdown transformer receives only Markdown text plus message type, streaming state and available width; Pi subsequently renders the transformed Markdown with its built-in renderer. The API documentation explicitly guarantees the original message remains unchanged in session and model context. This is suitable for safe text presentation edits, but does not expose user/assistant row containers, outer padding/alignment, grouping or transcript viewport control.

`registerMessageRenderer()` is documented for extension-defined custom message types. Creating a custom message with `sendMessage()` would participate in LLM context, so that API is not a safe way to replace built-in transcript messages under the mission's no-extra-context constraint.

Tool renderer resolvers run in extension load order and receive `next()` for composition/fallback. This supports replacing or extending tool presentation but requires careful fallback to preserve other renderers and unknown tools. Custom editor factories can wrap the previous editor, and `CustomEditor` retains Pi application keybindings when unhandled input is delegated to `super.handleInput()`. Header/footer replacement is supported; custom footer replaces the built-in footer entirely, so extension statuses need deliberate preservation. Theme colors have semantic roles for message, tool, Markdown, diff, syntax and editor colors, but operate within the stock component geometry.

## Verified API map

| Codex-facing requirement | Pi 1.5.0 public surface | Classification | Evidence and limit |
|---|---|---|---|
| Palette and semantic colors | Package theme JSON; `ctx.ui.setTheme()` | `SUPPORTED` for roles, `PARTIAL` for exact appearance | `docs/themes.md` and theme schema define semantic color roles and 256/truecolor support. Theme values do not alter stock layout geometry. Runtime theme selection writes a setting (also recorded in the project's existing capability matrix). |
| User and assistant text presentation | `pi.registerMarkdownTransformer()` | `PARTIAL` | `docs/extensions.md` § Markdown transformer: applies to user, assistant and thinking text, receives `availableWidth`, is rerun for streaming/restored/resize renders, original stays unchanged. It cannot supply row geometry or replace the transcript renderer. Preserve/return source unchanged for structured content the transformer cannot safely represent. |
| Full transcript row, alignment, grouping, viewport, scroll | No documented extension hook found | `BLOCKED` for exact replacement under constraints | `docs/tui.md` custom UI is for extension-owned interaction surfaces; the built-in transcript is not offered as a replaceable component. Markdown transforms affect content only. Revisit only if an executable public API proof shows a supported viewport hook. |
| Thinking text | Markdown transformer (`messageType: "assistant-thinking"`); `setHiddenThinkingLabel()` | `PARTIAL` | Covers transformed thinking Markdown or hidden-thinking label; does not establish ownership of every transient/completed activity row. |
| Tool invocation and output cards | `pi.registerToolRenderer(resolver)`; theme tool colors; `ctx.ui.setToolsExpanded()` | `SUPPORTED` for renderer access; `PARTIAL` for visual parity | Resolver docs specify `next()` chaining and allow previously unregistered tool names (e.g. resumed MCP tools). Unknown tools can fall through. Preserve native component interaction and do not alter input/result/error data. |
| Diffs | Tool renderer plus theme `toolDiff*` roles | `PARTIAL` | Theme schema supports diff color roles; file grouping, truncation and interactions depend on renderer/component behavior and need runtime screenshots. |
| Input editor geometry and placeholder | `ctx.ui.setEditorComponent()`, `getEditorComponent()`, `CustomEditor` | `SUPPORTED` for replacing/wrapping; `PARTIAL` for guaranteed input parity | Docs instruct capture and wrap previous factory; `CustomEditor` handles application shortcuts, `super.handleInput()` delegates other input. Must still verify paste, IME, autocomplete, image attachments and multi-extension composition in runtime. |
| Header and footer | `ctx.ui.setHeader()`, `setFooter()` | `SUPPORTED` | Factories use Pi's TUI component model. Footer factory replaces the built-in footer; model/context/status mapping is the extension's responsibility. |
| Responsive components within owned surface | Pi TUI component width/render APIs | `SUPPORTED` within component; `BLOCKED` for replacing transcript viewport | `docs/tui.md` requires render lines fit supplied width, documents visible-column helpers and resize/render lifecycle. These APIs govern extension-owned components, not built-in transcript ownership. |
| Startup/idle/streaming indicator | `setWorkingIndicator()`, `setStatus()`, `setHiddenThinkingLabel()` | `PARTIAL` | Supported status surfaces exist, but cannot control all Codex transient transcript cells. |
| No model-context/input changes | Avoid input/context hooks; display transformer only | `SUPPORTED` for that approach | Markdown API explicitly says original message remains unchanged in model/session context. Avoid `sendMessage`, `sendUserMessage`, input transforms and prompt hooks. Tool renderers are presentation selection APIs and should not touch tool calls/results. |

## Source evidence (installed 1.5.0)

- `docs/extensions.md` around lines 1807–1835 defines the Markdown transformer scope, inputs, synchronous/inexpensive expectation, streaming/restore/resize reruns, and display-only guarantee.
- `docs/extensions.md` around lines 2107–2121 defines renderer resolver chaining with `next()` and fallback behavior.
- `dist/core/extensions/types.d.ts` lines around 1180–1200 defines `MarkdownTransformContext`; around 1270–1285 defines the separate message, Markdown, entry and tool renderer registration interfaces.
- `docs/extensions.md` around lines 2900–2980 shows custom footer/header, hidden thinking label, autocomplete composition, editor factory composition, and theme APIs.
- `docs/extensions.md` around lines 3120–3145 instructs wrapping the previous editor factory and using `CustomEditor`/base input delegation.
- `docs/tui.md` says use the provided component system and “Do not create a second terminal renderer inside an extension”; it documents width fitting, visible-width helpers, focus/input handling and scroll behavior.
- `docs/themes.md` describes `system`, light/dark terminal adaptation, theme selection persistence, palette color forms, semantic role groups and package theme loading.
- `dist/core/extensions/types.d.ts` identifies `setFooter`, `setHeader`, `setEditorComponent`, and `setTheme` public signatures. Theme role names are defined in the installed theme schema (shipped source JSON is not included at this package path, although theme docs point to the published schema).

## Verified vs unverified

**Verified from installed source/docs:** Pi 1.5.0 is installed; documented public APIs above exist in the shipped declarations; Markdown transforms are display-only; Markdown, tool, editor, header and footer extension points are distinct; editor factory wrapping and base keybinding delegation are supported; theme and TUI component guidance is documented.

**Not yet verified:** exact transcript row behavior under streaming, simultaneous renderer ordering with arbitrary extensions, editor stacking with installed Zentui, resize/attachment/IME behavior after a custom editor, visual match against Codex, all tool state/cancel/approval variants, and performance costs. Require executable proof/screenshots before promoting these to verified capability claims.

## Recommendation and blockers

Proceed with themes and native editor/header/footer presentation after preserving prior component factories where possible. Use Markdown transforms only for transformations that preserve Markdown structure and source data. Tool renderer work should return `next()` for unhandled tools and chain via `next()` when compatibility permits. Do not attempt to recreate the conversation viewport from a widget or custom screen: that would replace normal Pi presentation and interaction rather than decorate it through an exposed hook. Treat exact user-message background shape/padding, assistant row spacing, transcript scrolling/selection layout, and Codex transcript tool cells as unsupported unless a documented API or minimal public-API proof establishes otherwise.

No Pi internals, private hooks, runtime monkey-patching, input transforms, prompt injection, or extra model messages/tools are needed for the supported subset.
