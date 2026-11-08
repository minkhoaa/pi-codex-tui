
# Project Definition: Pi Codex TUI

## 1. Project Goal

Build `pi-codex-tui`, a visual-only extension for the native Pi coding agent that reproduces the official OpenAI Codex CLI terminal interface as faithfully as technically possible.

The extension must change **presentation only**, never agent functionality, execution semantics, or underlying architecture.

**Primary objective:** Codex CLI visual fidelity approaching 100%, subject to Pi's supported extension capabilities.

**Fundamental invariant:**

> Same Pi agent, same behavior, same capabilities, same model context — only the terminal presentation changes.

## 2. Target User Experience

Installation:

```bash
pi install git:github.com/OWNER/pi-codex-tui
```

Execution:

```bash
pi
```

Expected behavior:

- Pi starts normally with the Codex-style interface.
- All existing Pi commands, shortcuts, tools, sessions, and extensions remain functional.
- No separate launcher, frontend, server, or RPC process.
- Uninstalling or disabling the extension restores the original Pi UI.
- No manual modification of Pi's installed source code.

The extension must behave like a standard Pi package, similar to Zentui in its installation and integration model.

## 3. Visual Fidelity Requirements

**Canonical reference:** Official OpenAI Codex CLI TUI.

Use the actual Codex source code and reproducible terminal screenshots as the source of truth.

Do not approximate visual behavior based solely on screenshots, community themes, or assumptions.

### 3.1 Theme and Colors

Reproduce the Codex visual palette, including:

- Terminal background relationships
- Foreground text and muted text
- User message background
- Accent and status colors
- Borders and separators
- Selection and focus states
- Syntax highlighting
- Diff additions and deletions

Prefer exact values extracted from the upstream implementation.

### 3.2 Conversation Rendering

**User messages:**
- Codex-style solid background.
- Matching padding, width, alignment, and spacing.
- Correct multiline wrapping.
- Preserve Markdown, attachments, and image display.

**Assistant messages:**
- Matching typography, indentation, and spacing.
- Minimal unnecessary borders or decorations.
- Native support for Markdown, lists, tables, and code blocks.
- Faithful streaming behavior.

**Thinking and progress:**
- Codex-style presentation.
- Consistent transient and completed states.
- No modifications to reasoning content or model execution.

### 3.3 Tool Calls and Results

Reproduce Codex-style rendering for:

- Tool invocation
- Running, success, failure, and cancellation states
- Compact tool summaries
- Expandable output
- File reads and writes
- Bash execution
- Code diffs
- Long-running operations

Maintain original tool results and expand/collapse semantics.

Custom tools and subagents must continue to work.

### 3.4 Input Editor

Reproduce the Codex CLI input composer:

- Border geometry
- Background
- Padding
- Placeholder
- Cursor and selection styling
- Multiline layout
- Focus and active states
- Model and contextual indicators, where available

Preserve Pi's native editor functionality:

- Keyboard shortcuts
- History navigation
- Autocomplete
- Slash commands
- Multiline input
- Clipboard/paste behavior
- Image attachments
- Existing input handling

### 3.5 Header, Footer, and Layout

Reproduce Codex-style:

- Header placement and visual hierarchy
- Footer/statusline
- Model and context indicators
- Terminal-width adaptation
- Horizontal and vertical spacing
- Responsive behavior
- Message grouping
- Scroll and viewport presentation

Avoid decorative elements not present in the canonical Codex reference.

## 4. Non-Negotiable Constraints

### 4.1 No Core Modifications

MUST NOT:

- Fork or modify Pi core.
- Patch installed files under `node_modules`.
- Replace the agent runtime.
- Modify Pi's internal execution logic.
- Require a custom Pi distribution.

Use supported extension and TUI APIs wherever possible.

### 4.2 Visual-Only Operation

MUST NOT alter:

- System, developer, or user prompts
- Model requests or responses
- Tool definitions or invocation parameters
- Agent loop and execution lifecycle
- Context management or compaction
- Session persistence and history
- Provider configuration
- Subagent behavior
- Permission and approval semantics
- User input submitted to the model

Presentation transformations must never mutate their underlying data.

### 4.3 No Additional Model Overhead

- No extra LLM requests.
- No added system prompt content.
- No additional model-visible tools.
- No model-visible instructions.
- No changes to token usage attributable to the extension's own context injection.

Render-time CPU and memory costs must remain minimal and measurable.

### 4.4 No Separate Frontend

Forbidden architectures:

- RPC-based frontend
- External TUI process
- Browser-based UI
- Local UI server
- Wrapper CLI replacing the `pi` executable
- Custom harness

The extension must run inside the standard native Pi interactive process.

### 4.5 Compatibility and Reversibility

- Must not break existing Pi functionality.
- Must tolerate unknown/custom tools.
- Must preserve standard extension behavior.
- Must avoid conflicting with other UI renderers.
- Must provide safe enable/disable behavior.
- Must restore the original presentation after uninstall.
- Must not leave modifications in Pi core.

## 5. Technical Architecture

Preferred architecture:

```text
Native Pi CLI
    |
    v
Pi Extension System
    |
    v
pi-codex-tui
    |
    +-- Theme / Color Tokens
    +-- User Message Presentation
    +-- Assistant / Markdown Presentation
    +-- Tool Call Renderers
    +-- Diff Presentation
    +-- Thinking / Progress Presentation
    +-- Editor Presentation
    +-- Header / Footer Presentation
    +-- Configuration
    |
    v
Existing Pi TUI APIs
    |
    v
Unmodified Pi Agent Core
```

Implementation rules:

1. Prefer public Pi extension APIs.
2. Reuse native `pi-tui` components where appropriate.
3. Keep styling and rendering separated from application logic.
4. Do not recreate the agent runtime.
5. Do not introduce functionality merely to imitate Codex behavior.
6. Preserve existing source data and lifecycle semantics.
7. Use graceful degradation for unsupported UI capabilities.

**Important limitation:**

Pi may not expose public APIs for every transcript or layout component.

Do not silently use private runtime patches, monkey-patching, or unsupported internal hooks to bypass this restriction.

Investigate and document these limitations during R&D.

If exact visual parity is impossible under the constraints, identify the specific unsupported components and quantify the remaining differences.

## 6. Research Requirements

Before implementation:

1. Inspect the current official Codex TUI source.
2. Inspect the current Pi TUI and extension APIs.
3. Inspect Zentui as an integration reference.
4. Map every target visual component to a supported Pi API.
5. Identify unavailable rendering hooks.
6. Investigate how Pi handles streaming, wrapping, viewport updates, and resize.
7. Identify existing UI extensions that could conflict.
8. Establish reproducible Codex screenshot baselines.

Produce a capability matrix:

| Component | Codex Reference | Pi API | Feasibility | Limitation |
|---|---|---|---|---|
| Theme | Source + screenshot | TBD | TBD | TBD |
| User messages | Source + screenshot | TBD | TBD | TBD |
| Assistant messages | Source + screenshot | TBD | TBD | TBD |
| Tool calls | Source + screenshot | TBD | TBD | TBD |
| Diffs | Source + screenshot | TBD | TBD | TBD |
| Thinking | Source + screenshot | TBD | TBD | TBD |
| Editor | Source + screenshot | TBD | TBD | TBD |
| Header/footer | Source + screenshot | TBD | TBD | TBD |
| Layout/viewport | Source + screenshot | TBD | TBD | TBD |

No implementation strategy may be treated as verified until supported by actual source inspection or an executable proof of concept.

## 7. Testing Requirements

### 7.1 Visual Regression

Compare Codex and Pi under equivalent:

- Terminal dimensions
- Terminal emulator
- Font configuration
- Color capability
- Conversation content
- Tool execution states

Test:

- Empty session
- User/assistant exchanges
- Multiline messages
- Markdown and code blocks
- Tool execution
- Large tool output
- Diffs
- Streaming
- Errors
- Session resume
- Terminal resize
- Light/dark modes where supported

Measure screenshot differences and document unavoidable deviations.

### 7.2 Functional Regression

Compare Pi with the extension enabled and disabled.

Verify:

- Same model/provider configuration
- Same available tools
- Same tool schemas
- Same commands and shortcuts
- Same session behavior
- Same attachment handling
- Same context configuration
- Same subagent functionality
- Same model-visible context for identical deterministic inputs

No behavioral changes are acceptable.

### 7.3 Performance Benchmark

Measure against unmodified Pi:

- Startup latency
- Idle memory usage
- CPU usage during rendering
- Streaming responsiveness
- Large transcript rendering
- Terminal resize performance
- Model token usage

The extension must introduce no model-context overhead and should have minimal runtime overhead.

## 8. Acceptance Criteria

### P0 — Mandatory

- [ ] Installable as a normal Pi extension.
- [ ] Launches using the unchanged `pi` command.
- [ ] No Pi core modifications.
- [ ] No RPC or external frontend.
- [ ] No added model-visible prompts or tools.
- [ ] No agent behavior changes.
- [ ] Existing Pi functionality remains operational.
- [ ] Fully removable without affecting Pi core.
- [ ] Unsupported UI areas degrade gracefully.

### P1 — Visual Fidelity

- [ ] Codex theme palette reproduced.
- [ ] User message appearance reproduced.
- [ ] Assistant message appearance reproduced where supported.
- [ ] Editor appearance reproduced without input regressions.
- [ ] Tool call and diff rendering reproduced.
- [ ] Header/footer and spacing reproduced.
- [ ] Streaming/progress appearance reproduced where supported.
- [ ] Visual comparison report completed.

### P2 — Quality

- [ ] Automated rendering tests.
- [ ] Functional regression tests.
- [ ] Performance benchmarks.
- [ ] Compatibility testing.
- [ ] Clean configuration and documentation.
- [ ] Upstream Pi version compatibility policy.

## 9. Explicit Non-Goals

This project is NOT intended to:

- Improve agent intelligence.
- Optimize token consumption.
- Replace Pi's execution harness.
- Reimplement Codex agent functionality.
- Add new tools or capabilities.
- Modify provider behavior.
- Introduce agent orchestration.
- Build a separate terminal application.
- Change session semantics.
- Replace existing user workflows.

The project exists exclusively to reproduce the Codex CLI visual experience inside native Pi.

## 10. Definition of Done

The project is complete when a user can install the extension, execute `pi`, and experience a terminal interface visually matching the official Codex CLI as closely as Pi's supported extension surface allows.

All existing Pi behavior must remain unchanged.

Visual differences must be documented and tested rather than hidden behind unsupported modifications.

**Final success condition:**

> Codex appearance. Pi execution. No core changes. No model overhead.
