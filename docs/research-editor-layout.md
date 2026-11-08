# Editor and Layout API Research

**Status:** Phase 1 research, 2026-11-08  
**Runtime checked:** Pi CLI 1.5.0, package sources under `/home/khoa/.pi/agent/install/releases/1.5.0/node_modules/@earendil-works/pi-coding-agent`  
**Public source references:** [Pi TUI docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md), [Pi extension docs](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md), [Pi TUI package](https://github.com/earendil-works/pi/tree/main/packages/tui)

## Findings

### Verified in Pi 1.5.0

- **Main editor replacement is a public extension API.** `ctx.ui.setEditorComponent(factory)` receives Pi's active TUI, theme and keybinding manager. `getEditorComponent()` supports wrapping a previously installed factory; passing `undefined` restores the default. The API is declared in installed `dist/core/extensions/types.d.ts` and explained in `docs/extensions.md` under “Custom Editor”.
- **`CustomEditor` is the safe extension base.** It extends Pi TUI's `Editor`, handles coding-agent application shortcuts (interrupt, exit, model switch, image paste, extension shortcuts and others), then delegates editor actions to the base. The installed `custom-editor.d.ts` exposes `onPasteImage`, `onEscape`, `onCtrlD`, `onExtensionShortcut`, action registration and `embedWorkingStatus`. The extension docs explicitly recommend extending `CustomEditor`, forwarding unhandled input to `super.handleInput(data)`, and composing with another extension's current editor factory.
- **Styling can stay presentation-only.** A subclass can configure/render the editor with Pi's active editor theme and change border/prompt/status styling while keeping inherited text editing, cursor, selection and input handling. The public editor API does not establish that every Codex composer behavior can be matched; inspect Pi TUI `Editor` options/theme before implementing. Pi's API docs recommend passing active theme/keybindings through.
- **Header and footer factories are public.** `setHeader()` and `setFooter()` can replace the corresponding native component; `undefined` restores the built-in component. The custom footer callback receives `footerData`, including git branch and extension statuses collected through `setStatus()`. Because replacement is total, a custom footer needs to preserve or intentionally surface those values for other extensions. The custom header is described as the startup header above chat, so it is not a documented continuously refreshed arbitrary transcript overlay.
- **Status and contextual widgets are supported separately.** The extension UI has `setStatus`, `setWidget` (above or below editor), title and working indicator APIs. They provide ways to display model/context indicators without changing the editor's submitted text. A custom footer can inspect supported footer data but should not infer inaccessible transcript state.
- **Width and resize are handled through the component contract.** Pi TUI components render lines for the current available width; the docs require truncation/wrapping by visible terminal columns, invalidation when content/theme changes, and a render request after state changes. Pi documents resize-event testing and `PI_TUI_WRITE_LOG`. This supports responsive header/footer/editor drawing, but does not expose control of the main transcript viewport geometry.
- **Autocomplete is composable.** `addAutocompleteProvider(factory)` stacks a provider over the built-in slash-command/path provider. The supported pattern delegates unmatched suggestions and `applyCompletion()` to the existing provider. No need to register a new provider for visual styling; avoid changing completions for this visual-only extension.
- **Image paste remains an app action.** `CustomEditor` recognizes the configured `app.clipboard.pasteImage` action and calls Pi's `onPasteImage` handler. Its base implementation otherwise preserves normal editing and application keybindings. The extension API includes `pasteToEditor()` and existing user prompts expose images as attachments; the styling extension should not intercept or rewrite attachment data.
- **Keyboard and IME behavior have documented integration requirements.** Pi passes its configurable `KeybindingsManager`; TUI docs instruct custom components to use `matchesKey()`/keybindings and preserve focus propagation to wrapped `Input`/`Editor` children so IME candidate windows stay positioned. Wrapping another editor factory is documented. Actual parity across terminal emulators/IME implementations remains a runtime verification item.

### Proposed supported design

Use a thin subclass of `CustomEditor` that only selects Codex-like editor colors/border and prompt presentation, with existing Pi editor theme roles where possible. Call `super.handleInput()` for all non-presentation actions, do not add keybindings, and do not install an autocomplete provider. If another editor factory is present, wrap it by capturing `getEditorComponent()` first (or explicitly defer to it) rather than silently replacing its behavior. Set custom header/footer factories only when they can be composed safely; preserve footer status and branch information from the supplied `footerData`. Use theme plus current render width for responsive layout and test narrow terminals, resize, theme changes, autocomplete open, history, multiline, paste, and image-paste shortcuts.

The documented API makes editor/header/footer styling `SUPPORTED` in principle. Exact Codex composer geometry, cursor/selection behavior and model/context indicators are `PARTIAL` pending measurement against Codex reference and verification that the installed Pi editor exposes enough styling hooks. Input, history, autocomplete, shortcuts and attachment parity must be demonstrated by regression checks, not assumed from the base class.

## Limitations and uncertainty

- There is no documented extension API here for moving/resizing Pi's transcript viewport or changing native chat-to-editor allocation. A custom header/footer does not grant ownership of chat layout.
- `setHeader()`/`setFooter()` are singleton replacement points. Extension ordering/composition with arbitrary UI extensions is not guaranteed by the API excerpt; capture existing editor factory where possible and keep a fallback. Multiple extensions replacing header/footer may conflict.
- This report confirms installed Pi 1.5.0 declarations/docs. It does not prove runtime input parity, terminal resize behavior, image paste, IME, screenshot parity or any behavior in newer Pi releases.
- Codex-specific dimensions/tokens are out of this workstream; compare to the visual-forensics report before declaring exactness.

## Evidence locations

- Pi 1.5.0 `docs/tui.md`: component layout/width, invalidation, keybindings, IME focus, resize test guidance, `PI_TUI_WRITE_LOG`.
- Pi 1.5.0 `docs/extensions.md`: “Custom Footer”, “Custom Header”, autocomplete provider composition and “Custom Editor”.
- Pi 1.5.0 `dist/core/extensions/types.d.ts`: `setHeader`, `setFooter`, `setEditorComponent`, `getEditorComponent`, `pasteToEditor`, `addAutocompleteProvider` declarations.
- Pi 1.5.0 `dist/modes/interactive/components/custom-editor.d.ts`: `CustomEditor` public members.
- Pi 1.5.0 `dist/modes/interactive/components/custom-editor.js.map` embeds the compiled package's `src/modes/interactive/components/custom-editor.ts`; inspection confirms app actions route through `CustomEditor.handleInput()` and unhandled keys reach `Editor.handleInput()`.
