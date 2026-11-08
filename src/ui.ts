import {
  CustomEditor,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { EditorTheme, TUI } from "@earendil-works/pi-tui";
import type { KeybindingsManager } from "@earendil-works/pi-coding-agent";

/**
 * Apply the small editor presentation change supported by Pi's public API.
 *
 * Codex draws the composer without Pi's horizontal editor rules. This keeps
 * Pi's editor, keybindings, cursor, selection, autocomplete and attachments,
 * and hides only those rules when they carry no working/overflow indicator.
 * A previously installed editor factory is left untouched because Pi has no
 * documented way to decorate an arbitrary editor component without replacing
 * its implementation.
 */
export function installUiPresentation(ctx: ExtensionContext): () => void {
  if (!ctx.hasUI || ctx.mode !== "tui") return () => {};

  const previous = ctx.ui.getEditorComponent();
  if (previous) return () => {};

  const factory = (tui: TUI, theme: EditorTheme, keybindings: KeybindingsManager) =>
    new CodexPresentationEditor(tui, theme, keybindings);

  ctx.ui.setEditorComponent(factory);

  return () => {
    // Do not undo a later editor installed by another extension.
    if (ctx.ui.getEditorComponent() === factory) {
      ctx.ui.setEditorComponent(previous);
    }
  };
}

class CodexPresentationEditor extends CustomEditor {
  protected override renderTopBorder(width: number, hiddenLineCount: number): string {
    // Keep Pi's embedded working state and multiline overflow signal visible.
    if (this.embedWorkingStatus || hiddenLineCount > 0) {
      return super.renderTopBorder(width, hiddenLineCount);
    }
    return " ".repeat(Math.max(0, width));
  }

  protected override renderBottomBorder(width: number): string {
    return " ".repeat(Math.max(0, width));
  }
}
