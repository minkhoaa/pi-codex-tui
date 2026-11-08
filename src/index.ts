import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { installUiPresentation } from "./ui.js";

/**
 * Presentation-only bootstrap. Pi's public setTheme API persists its choice,
 * so restore the prior single-theme setting on orderly shutdown. Auto-paired
 * settings are left alone because the public setter cannot select or restore a pair.
 */
export default function (pi: ExtensionAPI): void {
  let previousTheme: string | undefined;
  let activeTheme: string | undefined;
  let restoreTheme = false;
  let restoreUi = () => {};

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI || ctx.mode !== "tui") return;

    restoreUi = installUiPresentation(ctx);
    previousTheme = pi.getSettings().theme ?? "system";
    // setTheme accepts one theme name, not Pi's persisted light/dark pair.
    // Leave auto-paired preferences alone rather than flattening them on exit.
    if (previousTheme.includes("/")) return;

    const codexTheme = ctx.ui.theme.appearance === "light" ? "codex-tui-light" : "codex-tui-dark";
    const result = ctx.ui.setTheme(codexTheme);
    restoreTheme = result.success;
    activeTheme = result.success ? codexTheme : undefined;
  });

  pi.on("session_shutdown", (_event, ctx) => {
    restoreUi();
    restoreUi = () => {};
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
