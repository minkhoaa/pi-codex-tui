# Codex TUI Visual Forensics

**Scope:** Official OpenAI Codex terminal UI visual rules only.  
**Inspected:** 2026-11-08 (UTC date); source call sites below were first inspected through moving `main` links. The local Codex CLI is `0.167.0`, release tag `rust-v0.167.0`, source commit [`086ccc833bc9cf01024ad2dd6af7dbd421b6bf9a`](https://github.com/openai/codex/commit/086ccc833bc9cf01024ad2dd6af7dbd421b6bf9a). The source findings have not yet been rechecked line by line against that pinned commit, so treat them as research leads until verified against the tag.

## Verified from upstream source

### Colors and typography

- Codex does not use one fixed user-message background hex value. `user_message_bg_rgb()` blends black at 4% over a known light terminal background, or white at 12% over a known dark terminal background; `best_color()` then adapts that result to terminal color depth. If the terminal background is unknown, `user_message_style_for()` returns the default style. [style.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs#L250-L304)
- The shared accent is ChatGPT Blue 200 `#63A8F8`; on light backgrounds the preferred accent is `#1C64C8`. Selection fills use ChatGPT Blue 100 `#A4CDFB`. These values still pass through terminal palette/contrast selection. [style.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs#L17-L26), [accent selection](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs#L264-L275)
- Status semantics use bold ANSI green for success, red for failure, and yellow for attention only on known dark backgrounds; attention falls back to reset on light/unknown backgrounds, and all tones fall back to reset when color level is unknown. [style.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs#L47-L72)
- The style guide says headers are bold, primary text uses terminal default foreground, secondary/status/footer text uses a readable muted foreground, success/additions use ANSI green, errors/deletions use ANSI red, and Codex identity uses ANSI magenta. It discourages hard-coded ANSI black/white foregrounds and ANSI blue/yellow except where semantic rules permit yellow. [styles.md](https://github.com/openai/codex/blob/main/codex-rs/tui/styles.md)
- No font family, point size, or line-height is selected in these terminal source files; glyph metrics come from the terminal/font. “Typography parity” can therefore be measured only as terminal-cell formatting (bold/dim, indentation, Markdown/code treatment), not typeface choice.

### Message geometry and Markdown

- The chat surface is made from finalized `HistoryCell`s plus a mutable `active_cell`; streaming changes the active cell in place. The transcript overlay can include a cached render-only tail for live tool calls. This is source evidence for a multi-cell transcript, not one monolithic Markdown block. [chatwidget.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget.rs#L0-L22)
- User prompts are width-sensitive. Upstream reserves two columns for the live prefix/gutter and an additional one-column right margin before wrapping; `ui_consts.rs` documents that two-column reservation as the composer left border plus padding, status indentation, and user-history prefix allowance. [messages.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L227-L253), [ui_consts.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/ui_consts.rs#L0-L9)
- User content is wrapped before the message gutter/background padding. Explicit newlines are retained, wrapping is width-aware, and oversized URL tokens receive a second explicit split path to avoid losing the gutter/background on terminal autowrap. [messages.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L310-L350)
- Assistant first lines use a dim `• ` prefix; continuation lines use two spaces. During streaming, the first-line/continuation prefix is similarly retained, while the streaming controller renders the live tail at the current stream width rather than rewrapping it in the history cell. [messages.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L478-L514), [stream tail](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L693-L745)
- Agent Markdown is re-rendered from retained Markdown on terminal resize; ordinary Markdown has a render cache, and list spacing differs between display/scrollback (`AfterMultiline`) and detailed retained transcript (`Uniform`). Tables use box-drawing borders. [messages.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L515-L528), [Markdown cell](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs#L663-L688)

### Composer, footer, and status indicators

- The composer paints a flat styled `Block::default()` across its computed `composer_rect`; that block has a background style but no border widget/border set at this call site. The prompt occupies a live-prefix column immediately left of the textarea. The editable area, previews, remote-image labels, status/footer and hints are separate rectangles/rows. [chat_composer.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/chat_composer.rs#L4639-L4693)
- Composer height is constrained in fullscreen mode; footer and completion-menu measurement/layout are coordinated so width changes do not make measurement disagree with painting. The exact composer height and border/padding silhouette is computed across layout helpers, not captured by a single universal constant. [chat_composer.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/chat_composer.rs#L0-L24), [footer.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/footer.rs#L23-L39)
- The footer separates transient instructions from configurable contextual status. On narrow widths it drops/shrinks hints and context in a defined order; Codex uses ` · ` between footer actions/context. [footer.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/footer.rs#L0-L39), [style guide](https://github.com/openai/codex/blob/main/codex-rs/tui/styles.md#L2-L10)
- ChatWidget derives a “task running” state that controls the spinner/interrupt hints; during commentary streaming it suppresses duplicate status while tokens are arriving and restores status between bursts after the stream queue drains. [chatwidget.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget.rs#L18-L27)

## Reproducible visual-reference plan

1. Record full Codex commit SHA, Pi version, terminal emulator/version, TERM/color depth, dimensions, font, locale, and theme background. Links to `main` are discovery links; generate permanent `blob/<full-sha>/...` links for the baseline record.
2. Capture identical deterministic fixtures at 120x40, 80x24, and 40x16: empty chat; short and multiline user/assistant exchanges; Markdown list/table/fenced code; tool activity success/failure; running stream; prompt with image placeholder; long wrapped URL; resize and resumed transcript.
3. Use a fixed font and terminal emulator with truecolor first, then repeat on ANSI-256 and ANSI-16. Keep the terminal background constant within each light/dark pair and capture raw terminal output alongside screenshots so style and geometry diffs can be inspected independently.
4. Upstream `history_cell/messages_tests.rs` contains width regression coverage for user prompt URL wrapping at 120/60/24 columns and emits an Insta text snapshot. This is useful for geometry, but it is not a pixel screenshot or complete TUI baseline. [messages_tests.rs](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages_tests.rs#L4-L50)

The repository now includes `scripts/capture-tui.mjs` for raw ANSI capture at explicit PTY dimensions. A local Codex 0.167.0 run at 80x24 with a fresh isolated `CODEX_HOME` reached first-run sign-in; it did not provide an authenticated conversation reference. The capture is intentionally not recorded as a Codex chat baseline. A matching Pi package capture was also made at 80x24, but there is no content-equivalent state to compare.

## Uncertainty and limits

- I did not execute Codex or capture screenshots in this research pass. No screenshot dimensions, raster measurements, or pixel-difference result is claimed.
- The visual rules are terminal-background and color-depth aware, so the existing Pi static theme files cannot be assumed to reproduce the behavior exactly for arbitrary terminal palettes. This is an inference from the source computations; validate with Pi's supported theme API and paired screenshots.
- A precise Composer ASCII geometry diagram and user-cell vertical spacing are not established by this pass. Layout is assembled from multiple functions; inspect the remaining composer geometry helpers and capture snapshots before turning guessed pixel/cell spacing into acceptance thresholds.
- Upstream layout and colors can change on `main`. The local release is pinned, but all source call sites still need confirmation against the full release SHA before comparisons.

## Primary source links

- [OpenAI Codex TUI style implementation](https://github.com/openai/codex/blob/main/codex-rs/tui/src/style.rs)
- [Codex style guide](https://github.com/openai/codex/blob/main/codex-rs/tui/styles.md)
- [Codex chat widget](https://github.com/openai/codex/blob/main/codex-rs/tui/src/chatwidget.rs)
- [Codex user/assistant history cells](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs)
- [Codex composer](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/chat_composer.rs)
- [Codex footer](https://github.com/openai/codex/blob/main/codex-rs/tui/src/bottom_pane/footer.rs)
- [Codex TUI layout constants](https://github.com/openai/codex/blob/main/codex-rs/tui/src/ui_consts.rs)
- [Codex history-cell wrapping tests](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages_tests.rs)
