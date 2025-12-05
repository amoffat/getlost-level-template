import * as P from "pixi.js";

/**
 * Interface that tools must implement to handle pointer events.
 */
export interface Tool {
  /**
   * Handle a pointer down event.
   * @param event The pointer event
   * @returns Whether to continue or stop event propagation
   */
  onPointerDown?(event: P.FederatedPointerEvent): boolean;

  /**
   * Handle a pointer up event.
   * @param event The pointer event
   * @returns Whether to continue or stop event propagation
   */
  onPointerUp?(event: P.FederatedPointerEvent): boolean;

  /**
   * Handle a pointer move event.
   * @param event The pointer event
   * @returns Whether to continue or stop event propagation
   */
  onPointerMove?(event: P.FederatedPointerEvent): boolean;
}

/**
 * A centralized event dispatcher that manages pointer events and distributes
 * them to registered tools in priority order.
 */
export class ToolDispatcher {
  private stage: P.Container;
  private tools: Tool[] = [];

  /**
   * Creates a new ToolDispatcher.
   * @param app The Pixi.js Application instance
   */
  constructor(app: P.Application) {
    this.stage = app.stage;
    this.attachListeners();
  }

  /**
   * Attaches event listeners to the stage.
   */
  private attachListeners(): void {
    this.stage.eventMode = "static";

    this.stage.on("pointerdown", (event: P.FederatedPointerEvent) => {
      this.handlePointerDown(event);
    });

    this.stage.on("pointerup", (event: P.FederatedPointerEvent) => {
      this.handlePointerUp(event);
    });

    this.stage.on("pointermove", (event: P.FederatedPointerEvent) => {
      this.handlePointerMove(event);
    });
  }

  /**
   * Handles pointer down events by dispatching to tools in order.
   */
  private handlePointerDown(event: P.FederatedPointerEvent): void {
    for (const tool of this.tools) {
      if (tool.onPointerDown) {
        const handled = tool.onPointerDown(event);
        if (handled) {
          break;
        }
      }
    }
  }

  /**
   * Handles pointer up events by dispatching to tools in order.
   */
  private handlePointerUp(event: P.FederatedPointerEvent): void {
    for (const tool of this.tools) {
      if (tool.onPointerUp) {
        const handled = tool.onPointerUp(event);
        if (handled) {
          break;
        }
      }
    }
  }

  /**
   * Handles pointer move events by dispatching to tools in order.
   */
  private handlePointerMove(event: P.FederatedPointerEvent): void {
    for (const tool of this.tools) {
      if (tool.onPointerMove) {
        const handled = tool.onPointerMove(event);
        if (handled) {
          break;
        }
      }
    }
  }

  /**
   * Registers a tool for event handling.
   * @param tool The tool to register
   */
  public registerTool(tool: Tool): void {
    if (!this.tools.includes(tool)) {
      this.tools.push(tool);
    }
  }

  /**
   * Unregisters a tool from event handling.
   * @param tool The tool to unregister
   */
  public unregisterTool(tool: Tool): void {
    const index = this.tools.indexOf(tool);
    if (index !== -1) {
      this.tools.splice(index, 1);
    }
  }

  /**
   * Sets a tool as active, moving it to the front of the processing order.
   * @param tool The tool to set as active
   */
  public setActiveTool(tool: Tool): void {
    const index = this.tools.indexOf(tool);
    if (index !== -1) {
      // Remove from current position
      this.tools.splice(index, 1);
      // Add to front
      this.tools.unshift(tool);
    }
  }

  /**
   * Gets all registered tools in their current priority order.
   * @returns Array of registered tools
   */
  public getTools(): readonly Tool[] {
    return [...this.tools];
  }

  /**
   * Clears all registered tools.
   */
  public clearTools(): void {
    this.tools = [];
  }
}
