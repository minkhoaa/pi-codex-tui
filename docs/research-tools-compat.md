# Tool Rendering and Compatibility Research

**Scope:** tool call/result rendering, execution states, diffs, custom tools, subagents, UI extension compatibility, and Zentui integration patterns.  
**Verified runtime:** Pi CLI 1.5.0 / installed `@earendil-works/pi-coding-agent` release 1.5.0 (2026-11-08).  
**Result:** Pi exposes enough public rendering surface to restyle tool rows while retaining native execution and interaction. Exact Codex layout is limited to tool rows only; the extension cannot replace the global transcript viewport through this API.

## Verified Pi capabilities

`pi.registerToolRenderer(resolver)` is a documented display API for calls to any named tool, including a tool that was persisted in a resumed session but is not currently registered. Resolvers receive `next()` for the remaining extension resolvers and registered tool renderer. They run in extension load order; `next() ?? renderer` fills only an otherwise-unhandled case. This makes delegation to existing tool renderers the safe default and avoids blanket replacement. See the installed 1.5.0 `docs/extensions.md` section “pi.registerToolRenderer” and `dist/core/extensions/runner.js` `resolveToolRenderers()`; public docs: [Pi extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md).

Renderer contracts in the installed 1.5.0 declarations and implementation:

- A tool definition may supply `renderCall` and `renderResult`; omitted slots use the native/fallback renderer. `renderShell: "self"` delegates framing and horizontal padding to the extension; the default shell uses Pi's `Box` and `outputPad`.
- Context exposes the same tool-call arguments, stable call ID, `executionStarted`, `argsComplete`, `isPartial`, `expanded`, `isError`, `durationMs`, `showImages`, working directory, output padding, invalidate function, and per-row state. This supports display of running/partial/success/error and expansion states without hooking the tool execution lifecycle.
- Pi's `ToolExecutionComponent` owns argument updates, execution state, returned `isError`, duration, expansion click handling, image rendering, and rerender requests. A returned result component is inside Pi's existing clickable result region; expanded state is passed to the renderer. The native fallback previews ten lines, shows an expand hint, preserves images, and uses pending/success/error backgrounds.
- If a call/result renderer throws, Pi catches it and falls back for that slot. Missing result renderer displays raw result text; missing call renderer displays the formatted tool name and arguments. The resolver should preserve fallback by returning `next()` for every unsupported or unknown tool.
- Renderers also feed HTML exports. Use simple components, keep render work inexpensive, and account for non-interactive export paths.

Evidence: installed files under `/home/khoa/.pi/agent/install/releases/1.5.0/node_modules/@earendil-works/pi-coding-agent/`: `docs/extensions.md` §§ “pi.registerToolRenderer”, “Custom Rendering”, “Fallback”; `dist/core/extensions/types.d.ts` (`ToolRenderContext`, `ToolRenderers`, `ToolRendererResolver`); `dist/core/extensions/runner.js` (`resolveToolRenderers`); `dist/modes/interactive/components/tool-execution.js` (`ToolExecutionComponent`). These establish the exact local Pi 1.5.0 behavior. Upstream `main` references are moving; pin a commit/tag for future compatibility reports.

### Diffs and execution states

Pi's theme schema includes diff colors for built-in tool output (the existing project matrix identifies `toolDiff*` roles); renderers can read active theme colors. A resolver can tailor call/result components, but customizing built-in file tools risks losing native per-file diff rendering, truncation, images, and summaries. Prefer the built-in renderer by default and theme token overrides for broad diff color changes. Only replace a built-in renderer after a runtime screenshot demonstrates a concrete gap and a test confirms unchanged arguments, result content, error flag, and expand behavior.

`context.isPartial` and `executionStarted` distinguish a pending/running row from a completed one; `context.isError` and `durationMs` describe completion. The renderer does not authorize, start, cancel, or modify tool execution. Cancellation/approval handling remains in Pi's execution and approval UI outside the rendering callback. Confirm full permission and cancellation parity in an executable runtime scenario before marking it verified; source inspection alone does not prove behavior with every custom extension.

### Custom tools and subagents

The resolver is name-based and is explicitly documented to cover tools that are not currently registered. Unknown tools safely continue to Pi's generic call/result display. For subagent tools or custom tools with distinct result structures, leave them to their registered renderer (`next()`) unless an explicit renderer is built against their public result contract. Do not add tools, invoke tools, rewrite arguments, alter results, or transform lifecycle events for presentation.

Tool renderers are a different surface from custom-message renderers: `registerMessageRenderer()` applies to messages created with the extension's own `customType`, which participate in LLM context. It is not a replacement hook for Pi's normal user/assistant transcript. A TUI-only `registerEntryRenderer()` is available for custom entries, but adding entries is outside this visual-only feature.

## Zentui integration reference

Zentui is a standard Pi extension package and useful evidence for composing `CustomEditor`, footer/statusline, and user-message presentation via Pi APIs. Its repository is MIT licensed. The main branch checked during this research was not pinned to a release commit, so treat it as an integration example, not a compatibility guarantee. References: [Zentui package](https://github.com/lmilojevicc/pi-zentui), [extension entry point](https://github.com/lmilojevicc/pi-zentui/blob/main/extensions/zentui/index.ts), [prototype patch registry](https://github.com/lmilojevicc/pi-zentui/blob/main/extensions/zentui/prototype-patch-registry.ts), [license](https://github.com/lmilojevicc/pi-zentui/blob/main/LICENSE).

The inspected current entry point shows editor factory ownership/wrapping logic and state synchronization for its UI, while the patch registry explicitly wraps prototype `render`/`invalidate` methods for adapters such as `user-message-render`, `user-message-invalidate`, and selector borders. That registry is a deliberate private runtime patch mechanism. It is outside this project's constraints and must not be copied or treated as evidence that Pi officially supports native transcript row replacement. Reuse only standard package/resource registration and documented public API ideas; do not copy MIT implementation code unless needed and then retain the license notice/attribution.

## Capability assessment

| Requirement | Status | Evidence / boundary |
|---|---|---|
| Theme built-in tool, pending, success, error, and diff colors | `SUPPORTED` | Pi theme schema and built-in renderer theme roles. |
| Style selected tool call/result rows using public resolver | `SUPPORTED` | `registerToolRenderer`, with native fallback by slot. |
| Preserve default tool behavior and custom tools | `SUPPORTED` with delegation | Resolver's `next()` chain and generic fallback; must avoid broad replacement. |
| Show partial/running/error/success/expanded states | `SUPPORTED` | Renderer context contains state flags; Pi owns result click/expand and execution lifecycle. |
| Exact Codex summaries/layout for every built-in/custom tool | `PARTIAL` | Per-tool renderer can shape content; replacing built-in renderers risks native diff/image/output detail and unknown tools remain generic. |
| Change tool invocation, permission, execution or cancellation semantics | `BLOCKED` by mission constraints | Requires execution lifecycle hooks or behavior mutation, not presentation. |
| Reproduce Codex transcript-level grouping/viewport around tools | `BLOCKED` by documented API boundary | Tool row renderer does not own the global transcript container or scroll view. |

## Recommendations and remaining checks

1. Start with theme-only tool and diff tokens, preserving Pi's native built-in renderers.
2. If a targeted row is changed, write a resolver that returns `next()` for all other tool names and for any missing slot; preserve `context.expanded`, `isPartial`, `isError`, `showImages`, and duration information.
3. Never convert a tool result into a replacement model message, alter result text/details/error, or add custom tools.
4. Runtime verification still needed: actual core built-in renderer composition and output, approval/cancel states, long output, diff rendering, images, custom tool/subagent compatibility, renderer ordering with other installed UI extensions, and HTML export.
5. Compatibility policy should treat Pi minor upgrades as requiring a focused tool-row smoke test. Public API types reduce risk but do not prove another extension's load order or visual assumptions.

## Uncertainty

Source inspection verified the API and native component paths in Pi 1.5.0, but this track did not run a custom renderer proof or take screenshots. It did not establish how all approval/cancel surfaces appear in each terminal emulator. Zentui's upstream `main` is mutable; findings about its source correspond to the viewed page only, with no pinned SHA in this report. The main unresolved technical risk is coexistence: resolvers compose through `next()`, but other extensions may replace theme/editor/footer or register targeted rendering behavior, so ordering and restoration must be tested in the actual extension set.
