import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installLayoutPresentation } from "./layout.js";
import { installUiPresentation } from "./ui.js";

/**
 * Presentation-only bootstrap. Pi's public setTheme API persists its choice,
 * so apply it only over the system default and restore that setting on orderly
 * shutdown. Explicit themes and auto-paired settings remain user-controlled.
 */
export default function (pi: ExtensionAPI): void {
  let previousTheme: string | undefined;
  let activeTheme: string | undefined;
  let restoreTheme = false;
  let restoreUi = () => {};
  let uiInstalled = false;
  let themeSelectionChecked = false;

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI || ctx.mode !== "tui") return;

    if (!uiInstalled) {
      const restoreEditor = installUiPresentation(ctx);
      const restoreLayout = installLayoutPresentation(ctx);
      restoreUi = () => {
        restoreLayout();
        restoreEditor();
      };
      uiInstalled = true;
    }

    if (themeSelectionChecked) return;
    themeSelectionChecked = true;
    const codexTheme = ctx.ui.theme.appearance === "light" ? "codex-tui-light" : "codex-tui-dark";

    // Theme changes use Pi's settings-backed setTheme API. Auto-select only
    // when Pi is using its system default, or when this package's own theme is
    // already selected. Preserve any deliberate user-selected theme.
    const configuredTheme = pi.getSettings().theme;
    const activeThemeName = ctx.ui.theme.name;
    previousTheme = configuredTheme ?? "system";
    if (
      (configuredTheme !== undefined && configuredTheme !== "system" && configuredTheme !== codexTheme) ||
      configuredTheme?.includes("/") ||
      (activeThemeName !== "system" && activeThemeName !== codexTheme)
    ) {
      return;
    }

    const result = ctx.ui.setTheme(codexTheme);
    restoreTheme = result.success;
    activeTheme = result.success ? codexTheme : undefined;
  });

  pi.on("session_shutdown", (_event, ctx) => {
    restoreUi();
    restoreUi = () => {};
    uiInstalled = false;
    if (
      !restoreTheme ||
      !previousTheme ||
      !activeTheme ||
      !ctx.hasUI ||
      ctx.mode !== "tui" ||
      ctx.ui.theme.name !== activeTheme
    ) {
      return;
    }

    ctx.ui.setTheme(previousTheme);
    restoreTheme = false;
    previousTheme = undefined;
    activeTheme = undefined;
  });
}
