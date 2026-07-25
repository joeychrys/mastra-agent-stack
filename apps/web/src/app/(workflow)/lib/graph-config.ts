// ---------------------------------------------------------------------------
// Graph canvas configuration.
//
// `CanvasConfig` is declared by every workflow page in its own `config.ts` —
// there are deliberately no shared default values, so a page's canvas is fully
// visible in one place and TypeScript fails the build if a page omits it.
//
// The constants below are internal layout mechanics, not design knobs, so they
// stay shared rather than being restated per page.
// ---------------------------------------------------------------------------

export type CanvasConfig = {
  /** Width for every node, unless overridden per node (`stepWidths`/`inputWidth`). */
  nodeWidth: number;
  /** Horizontal gap between nodes inside one row (parallel/conditional). */
  nodeSpacingX: number;
  /** Vertical gap between rows. */
  rowSpacingY: number;
  /** Margin around the graph when fitting the view. */
  fitViewPadding: number;
  /** Caps how far fitView zooms IN (React Flow's default is 2x). */
  fitViewMaxZoom: number;
  /** Lower bound for manual zoom-out. */
  minZoom: number;
  /**
   * Allow dragging nodes around the canvas. Note: the layout effect re-stacks
   * nodes into rows, so dragged positions won't stick while a run is updating.
   */
  nodesDraggable: boolean;
};

/** Id of the synthetic input node that always leads the graph. */
export const INPUT_NODE_ID = "__input__";

/**
 * Shared axis that every row's horizontal center aligns to. The absolute value
 * is arbitrary — fitView centers the viewport.
 */
export const CENTER_X = 300;

/** Height assumed for layout before React Flow measures a node. */
export const FALLBACK_NODE_HEIGHT = 64;

/** React Flow connection handle styling, shared by both node types. */
export const HANDLE_CLASS = "!size-1.5 !border-border !bg-muted-foreground/40";
