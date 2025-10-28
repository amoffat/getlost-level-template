import { log } from "@/log";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import {
  isObjectAnimation,
  isTileGroup,
  TileGroup,
  TilesetObject,
} from "@/types/tilegroup";
import { AllPropsLoose } from "@/types/union";
import * as P from "pixi.js";
import { ReduxReconciler } from "./reconciler";
import { invisibleStroke } from "./strokes";

export class TileReconciler extends ReduxReconciler<TilesetObject> {
  private spatialIndex?: SpatialIndex<TilesetObject>;
  private container?: P.Container;
  private connected = false;

  attachCanvas({
    spatialIndex,
    container,
  }: {
    spatialIndex: SpatialIndex<TilesetObject>;
    container: P.Container;
  }) {
    this.container = container;
    this.spatialIndex = spatialIndex;
    this.connected = true;
  }

  protected override applyProps(
    node: P.Container,
    p: AllPropsLoose<TilesetObject>
  ) {
    if (p.pos !== undefined) {
      node.position.set(p.pos.ul.x, p.pos.ul.y);
    }
  }

  protected override createNode(obj: TilesetObject): P.Container | null {
    if (isTileGroup(obj)) {
      return this.createTileGroupNode(obj);
    } else if (isObjectAnimation(obj)) {
      return null;
    } else {
      log.error("Unsupported TilesetObject type");
      return null;
    }
  }

  /**
   * This creates an *empty* object (invisible stroke) representing a TileGroup.
   * We could draw the tilegroup outline here, but then the scroll/zoom would
   * not be able to adjust the stroke width appropriately. Instead, we handle
   * that in the group overlay drawing code.
   *
   * Here we just produce the invisible container with the correct size and
   * position, so that getLocalBounds() works correctly for spatial indexing.
   * @param obj
   * @returns
   */
  private createTileGroupNode(obj: TileGroup): P.Container {
    const gfx = new P.Graphics();
    gfx.interactive = false;

    const rect = new P.Rectangle(
      0,
      0,
      obj.pos.br.x - obj.pos.ul.x,
      obj.pos.br.y - obj.pos.ul.y
    );
    gfx.rect(rect.x, rect.y, rect.width, rect.height).stroke(invisibleStroke);

    const container = new P.Container();
    container.label = obj.id;
    container.position.set(obj.pos.ul.x, obj.pos.ul.y);
    container.addChild(gfx);
    container.interactive = true;
    return container;
  }

  protected override insertItem(item: IndexItem): void {
    this.spatialIndex!.insert(item);
  }

  protected override updateItem(
    item: IndexItem,
    changes: ReduxReconciler<TilesetObject>["ObjParamsType"]
  ): void {
    // If position-affecting props are changing, update spatial index.
    const willAffectPos = "pos" in changes;
    if (willAffectPos) {
      this.spatialIndex!.update(item);
    }
  }

  protected override removeById(id: string): void {
    this.spatialIndex!.removeById(id);
  }

  protected override containerByObj(_obj: TilesetObject): P.Container {
    return this.container!;
  }

  protected override containerById(_id: string): P.Container {
    return this.container!;
  }

  protected override assertConnected() {
    if (!this.connected) {
      throw new Error("TileReconciler operation called before attachCanvas");
    }
  }
}
