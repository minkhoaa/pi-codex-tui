# Pi Message Rendering and Streaming Research

**Scope:** user/assistant message rendering, Markdown, thinking, streaming, wrapping and transcript viewport.  
**Verified runtime:** Pi CLI / `@earendil-works/pi-coding-agent` 1.5.0 installed locally (2026-11-08). The installed distribution is the strongest evidence below; official source/docs links are provided for review.  
**Result:** Markdown presentation transforms are supported and explicitly display-only. Full transcript row and viewport replacement is not exposed by the documented extension surface.

## Verified API and behavior

### Markdown transformation preserves model/session data

Pi 1.5.0 documents `pi.registerMarkdownTransformer(transformer)`. It receives a Markdown string and `{ messageType, isStreaming, availableWidth, messageId?, timestamp? }`, and returns a Markdown string. Transformers are chained in extension load order before Pi's built-in Markdown renderer. Pi states that this hook is display-only and leaves the original message unchanged in both session and model context. It runs for new user messages, assistant streaming updates, restored messages and terminal width changes. The synchronous, inexpensive requirement matters because reflow can invoke it again. See [Pi extension API: Markdown transformers](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) and local 1.5.0 `docs/extensions.md` § `pi.registerMarkdownTransformer`.

The installed declarations type `MarkdownTransformer` as `(markdown: string, context: MarkdownTransformContext) => string`; its context exposes no mutable message object. The installed implementation's `createMarkdownTransform` builds a fresh context, applies each returned string to a local `transformedMarkdown` variable, catches transformer exceptions and returns that value to the renderer. `UserMessageComponent` and `AssistantMessageComponent` pass the transform into `pi-tui`'s `Markdown`; the extension path does not write the transformed value back to a session entry. Evidence: installed `dist/core/extensions/types.d.ts` (`MarkdownTransformContext`, `MarkdownTransformer`); `dist/modes/interactive/components/markdown-transform.js`; `user-message.js`; `assistant-message.js`.

**Practical invariant:** A transformer that only returns alternate Markdown cannot change model/session content through this API. Extension authors should avoid substitutions that conceal or change the meaning of displayed user/assistant text, even though the underlying original remains intact. Do not use message/prompt hooks for styling.

### Streaming and thinking

In 1.5.0, the interactive UI creates an `AssistantMessageComponent` on `message_start`, updates it with each assistant `message_update`, then calls `updateContent(..., false)` on `message_end`. The renderer rebuilds its content from the event message; assistant text and thinking blocks each go through their respective Markdown transform contexts (`assistant` / `assistant-thinking`) and receive the current `isStreaming` value. A transformer can therefore distinguish partial from final rendering without changing stream timing or model behavior. Evidence: installed `dist/modes/interactive/interactive-mode.js` around the message event switch and `components/assistant-message.js`.

Thinking presentation is partially configurable through public UI APIs (including a hidden-thinking label and working indicator, as documented in `types.d.ts`), and Markdown transforms also receive thinking blocks. These do not expose a replacement for all assistant activity cells or their lifecycle. The core UI itself groups consecutive thinking blocks, supports hiding/showing a run, and inserts spacing around visible runs; extensions cannot replace that built-in layout through the Markdown hook.

### User messages, wrapping and attachments

The built-in user renderer creates `UserMessageComponent` from text extracted from the user message and passes it through Pi's Markdown component. The component uses theme foreground/background roles, applies configured horizontal/vertical padding and enables ordered-list marker preservation. The extension transformer gets exact `availableWidth`; this can support width-aware visual Markdown rendering while leaving the submitted message untouched. It does not provide controls for the outer user row's alignment, width, grouping, row padding geometry, or message placement. Themes can change the user message text/background roles but not those layout rules.

The interactive UI separately handles image-bearing user messages and text extraction. A Markdown transformer only receives the Markdown string, not the structured user message/content blocks or image attachments; therefore it cannot safely redraw/reorder images or attachment metadata. Keep native attachment handling intact.

Pi's `Markdown` component performs terminal rendering/wrapping, and the hook is run again when terminal width changes. This is the supported wrapping/reflow boundary. No extension API was found to dictate the built-in viewport's width calculation or reflow algorithm.

### Viewport and transcript layout

The installed 1.5.0 `createChatViewport()` creates a `ScrollView` with `follow: "end"`, then composes the transcript and fixed input dock in a `VStack`. The interactive mode owns the message container, streaming component and transcript scroll view. The public extension docs offer Markdown transforms and renderers for extension-defined custom messages/entries, but no documented hook to replace the native conversation history container, user/assistant row components, or transcript `ScrollView`.

This makes Codex-like Markdown content styling and native colors feasible, while full Codex transcript geometry, row grouping and viewport/scroll behavior are blocked under the project's public-API-only constraint. A private component reference, monkey patch or transcript DOM replacement would violate the project specification and is not recommended.

## Capability assessment for this scope

| Requirement | Assessment | Evidence / limitation |
|---|---|---|
| Style Markdown content for user, assistant and thinking | `SUPPORTED` | Public synchronous Markdown transformer plus Pi theme tokens. Original messages stay unchanged. |
| Apply rendering based on partial vs completed response | `SUPPORTED` | `isStreaming` context; built-in component already updates on message events. |
| Width-aware display transform and wrap/reflow | `SUPPORTED` (content-level) | `availableWidth`; Pi calls transforms on terminal width changes. Outer row and viewport remain native. |
| Change user-message colors | `SUPPORTED` | Native `userMessageBg` / `userMessageText` theme roles. |
| Change native user row alignment, width, padding geometry or grouping | `BLOCKED` via documented APIs | No native transcript-row renderer hook found. Markdown padding can affect content only and risks double-layout differences. |
| Replace assistant/thinking transcript cell layout or live activity cell | `BLOCKED` via documented APIs | Markdown hook only supplies content; interactive mode owns message components. |
| Reimplement native scroll/follow/reflow policy | `BLOCKED` via documented APIs | `ScrollView` and transcript container are internal to interactive mode. |
| Transform images/structured attachments via Markdown hook | `BLOCKED` | Hook receives only Markdown, not the original structured user message. Leave native image path intact. |

## Recommendation

Use the theme for colors and a conservative, synchronous Markdown transformer only for content-level styling that preserves meaning. For ordinary prose, an identity transform is the safest default; avoid changing words or omitting blocks. Keep Pi's native streaming, Markdown renderer, attachments and viewport. Mark Codex row geometry and transcript scrolling as unsupported rather than attempting a private hook.

## Source references

- [Pi extension API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md) — `registerMarkdownTransformer` contract.
- [Pi TUI API](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md) — supported component model and extension guidance.
- Installed Pi 1.5.0 files: `node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`; `dist/core/extensions/types.d.ts`; `dist/modes/interactive/interactive-mode.js`; `dist/modes/interactive/chat-viewport.js`; `dist/modes/interactive/components/markdown-transform.js`; `user-message.js`; `assistant-message.js` under `/home/khoa/.pi/agent/install/releases/1.5.0/`.
- Local installed version confirmed with `pi --version` → `1.5.0`; exact installed package version recorded in release `package.json` and lockfile. Upstream `main` links are moving; re-pin links to a release tag/commit when the project selects its compatibility baseline.

## Uncertainty

The installed generated JS and TypeScript declarations establish Pi 1.5.0 behavior, but the current public documentation links point to `main`, and this inspection did not pin an upstream Git commit. No executable proof or screenshot comparison was run in this research task. Conclusions about exact visual wrapping and image presentation should be checked under the target terminal/font/color setup.
