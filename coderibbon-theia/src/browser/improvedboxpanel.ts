import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  Panel,
  DockLayout,
  BoxLayout,
} from "@phosphor/widgets";
import { find } from "@phosphor/algorithm";
import { IDisposable } from "@phosphor/disposable";
import { Message, MessageLoop, ConflatableMessage } from "@phosphor/messaging";
import { Drag, IDragEvent } from "@phosphor/dragdrop";

import { ImprovedBoxLayout } from "./improvedboxlayout";

// TODO prefer not to include CR stuff in IBP / IBL
import { crdebug } from "./cr-logger";

/**
 * mostly stuff to bring BoxPanel up to par with DockPanel
 */
export class ImprovedBoxPanel extends BoxPanel {
  protected _renderer: ImprovedBoxLayout.IRenderer | DockPanel.IRenderer;
  protected _pressData: Private.IPressData | null = null;

  constructor(options: ImprovedBoxPanel.IOptions = {}) {
    // @ts-expect-error TODO
    super({ layout: Private.createLayout(options) });
    this.addClass("p-ImprovedBoxPanel");
    // should be getting the renderer from Theia here, not from phosphorjs
    // crdebug("IBP got renderer", options.renderer);
    this._renderer = options.renderer || DockPanel.defaultRenderer;
  }

  override dispose(): void {
    this._releaseMouse();

    // this.overlay.hide(0);
    //
    // if (this._drag) {
    //   this._drag.dispose();
    // }

    super.dispose();
  }

  // activateWidget(widget: Widget): void {
  //   // TODO
  //   throw Error("NotYetImplemented");
  // }

  // saveLayout(): ImprovedBoxLayout.ILayoutConfig {
  //   crdebug("IBP saveLayout");
  //   return (this.layout as ImprovedBoxLayout).saveLayout();
  // }

  // restoreLayout(config: ImprovedBoxLayout.ILayoutConfig): void {
  //   crdebug("IBP restoreLayout:", config);
  //   // TODO
  // }

  // selectWidget() {
  //   // TODO
  //   throw Error("NotYetImplemented");
  // }
  //
  // selectedWidgets() {
  //   // TODO
  //   throw Error("NotYetImplemented");
  // }

  get renderer(): ImprovedBoxPanel.IRenderer {
    return (this.layout as ImprovedBoxLayout).renderer;
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case "mousedown":
        this._evtMouseDown(event as MouseEvent);
        break;
      case "mousemove":
        this._evtMouseMove(event as MouseEvent);
        break;
      case "mouseup":
        this._evtMouseUp(event as MouseEvent);
        break;
    }
  }

  /**
   * about 70-80% exactly the same as the DockPanel implementation
   * @param event browser-generated mouse event
   */
  private _evtMouseDown(event: MouseEvent): void {
    // we only care about mouse1
    if (event.button !== 0) {
      return;
    }

    // locate handle which might be targeted
    let layout = this.layout as ImprovedBoxLayout;
    let target = event.target as HTMLElement;
    let handle = find(layout.handles, (handle) => handle.contains(target));
    if (!handle) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // start listening for the drag events
    document.addEventListener("keydown", this, true);
    document.addEventListener("mouseup", this, true);
    document.addEventListener("mousemove", this, true);
    document.addEventListener("contextmenu", this, true);

    // compute offsets for handle grab location
    let rect = handle.getBoundingClientRect();
    let deltaX = event.clientX - rect.left;
    let deltaY = event.clientY - rect.top;

    let style = window.getComputedStyle(handle);
    let override = Drag.overrideCursor(style.cursor!);
    this._pressData = { handle, deltaX, deltaY, override };
  }

  private _evtMouseMove(event: MouseEvent): void {
    if (!this._pressData) return;

    event.preventDefault();
    event.stopPropagation();

    let rect = this.node.getBoundingClientRect();
    let xPos = event.clientX - rect.left - this._pressData.deltaX;
    let yPos = event.clientY - rect.top - this._pressData.deltaY;

    let layout = this.layout as ImprovedBoxLayout;
    layout.moveHandle(this._pressData.handle, xPos, yPos);
  }

  private _evtMouseUp(event: MouseEvent): void {
    // if not dragging: ignore
    if (!this._pressData) return;

    event.preventDefault();
    event.stopPropagation();

    this._releaseMouse();

    // TODO LayoutModified -> ???
    MessageLoop.postMessage(this, Private.LayoutModified);
  }

  private _releaseMouse(): void {
    if (!this._pressData) {
      return;
    }

    this._pressData.override.dispose();
    this._pressData = null;

    // Remove the extra document listeners.
    document.removeEventListener("keydown", this, true);
    document.removeEventListener("mouseup", this, true);
    document.removeEventListener("mousemove", this, true);
    document.removeEventListener("contextmenu", this, true);
  }

  protected override onBeforeAttach(msg: Message): void {
    this.node.addEventListener("mousedown", this);
  }

  protected override onAfterDetach(msg: Message): void {
    this.node.removeEventListener("mousedown", this);
  }
}

export namespace ImprovedBoxPanel {
  export type IRenderer = ImprovedBoxLayout.IRenderer | DockLayout.IRenderer;

  export interface IOptions {
    // from dockpanel
    renderer?: IRenderer;
    // from BoxPanel
    direction?: BoxPanel.Direction;
    alignment?: BoxPanel.Alignment;
    // common
    spacing?: number;
    // override
    layout?: ImprovedBoxLayout;
  }
}

namespace Private {
  // re-impl DockPanel.Private.IPressData
  export interface IPressData {
    handle: HTMLDivElement;
    deltaX: number;
    deltaY: number;
    // disposable will clear the override cursor
    override: IDisposable;
  }

  // re-impl DockPanel.Private.LayoutModified
  export const LayoutModified = new ConflatableMessage("layout-modified");

  export function createLayout(
    options: ImprovedBoxPanel.IOptions,
  ): ImprovedBoxLayout {
    return options.layout || new ImprovedBoxLayout(options);
  }
}
