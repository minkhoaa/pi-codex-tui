import type { ExtensionContext, ReadonlyFooterDataProvider, Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/**
 * Install the Codex-like status footer on Pi's native interactive UI.
 *
 * This intentionally leaves Pi's header alone: the public extension API has no
 * getter or composition hook for a previously registered header. The footer
 * API does expose branch and extension status data, which this component keeps
 * visible when replacing the built-in footer.
 */
export function installLayoutPresentation(ctx: ExtensionContext): () => void {
  if (!ctx.hasUI || ctx.mode !== "tui") return () => {};

  const factory = (tui: TUI, theme: Theme, footerData: ReadonlyFooterDataProvider) => {
    let disposed = false;
    const unsubscribe = footerData.onBranchChange(() => {
      if (!disposed) tui.requestRender();
    });

    const footer: Component & { dispose(): void } = {
      render(width: number): string[] {
        const model = ctx.model?.name ?? "Pi";
        const thinking = ctx.thinkingLevel;
        const usage = ctx.getContextUsage();
        const context = usage?.percent == null ? "" : `${Math.round(usage.percent)}% context`;
        const branch = footerData.getGitBranch();
        const left = [model, thinking, context].filter(Boolean).join(" · ");
        const right = branch ? `⌥ ${branch}` : "";
        const line = alignFooter(left, right, width, theme);

        const statuses = [...footerData.getExtensionStatuses().entries()]
          .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
          .map(([, value]) => sanitizeStatus(value))
          .filter(Boolean);

        return [line, ...(statuses.length ? [truncateToWidth(statuses.join("  "), width, theme.fg("dim", "…"))] : [])];
      },
      invalidate() {},
      dispose() {
        disposed = true;
        unsubscribe();
      },
    };

    return footer;
  };

  ctx.ui.setFooter(factory);
  return () => {
    // setFooter(undefined) restores Pi's built-in component. The extension API
    // has no footer getter, so no public way exists to restore an earlier
    // third-party footer factory. Do not add custom footer registrations that
    // must survive this extension's shutdown.
    ctx.ui.setFooter(undefined);
  };
}

function alignFooter(left: string, right: string, width: number, theme: Theme): string {
  const safeWidth = Math.max(0, width);
  const leftText = theme.fg("dim", truncateToWidth(left, safeWidth, theme.fg("dim", "…")));
  if (!right || safeWidth === 0) return leftText;

  const rightText = theme.fg("accent", truncateToWidth(right, safeWidth, theme.fg("dim", "…")));
  const leftWidth = visibleWidth(leftText);
  const rightWidth = visibleWidth(rightText);
  if (leftWidth + rightWidth >= safeWidth) {
    return truncateToWidth(leftText, Math.max(0, safeWidth - rightWidth), theme.fg("dim", "…")) + rightText;
  }

  return leftText + " ".repeat(safeWidth - leftWidth - rightWidth) + rightText;
}

function sanitizeStatus(value: string): string {
  return stripTerminalSequences(value).replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
}
