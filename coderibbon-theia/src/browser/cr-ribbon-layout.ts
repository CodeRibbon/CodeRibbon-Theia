/** @format */

import {
  injectable,
  inject,
  postConstruct,
} from "@theia/core/shared/inversify";

import { Signal } from "@lumino/signaling";
import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  DockLayout,
  BoxLayout,
  BoxEngine,
  BoxSizer,
} from "@lumino/widgets";
import { ElementExt } from "@lumino/domutils";
import { Message, MessageLoop } from "@lumino/messaging";
import { empty } from "@lumino/algorithm";
// import {
//   MessageService,
//   Emitter, environment,
//   Disposable, DisposableCollection,
// } from '@theia/core/lib/common';
// import {
//   TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID, MAXIMIZED_CLASS,
// } from '@theia/core/lib/browser/shell/theia-dock-panel';
import { FrontendApplicationStateService } from "@theia/core/lib/browser/frontend-application-state";
import { CorePreferences } from "@theia/core/lib/common/core-preferences";

import { crdebug } from "./cr-logger";

import { RibbonPanel } from "./cr-interfaces";

@injectable()
// @ts-expect-error TS2415: Class incorrectly extends base class
export class CodeRibbonTheiaRibbonLayout extends BoxLayout {
  // Horizontal Patches Per Screen
  private _hpps: number = 2;
  set hpps(value: number) {
    crdebug("set hpps to", value);
    this._hpps = value;

    // refit
  }

  get hpps(): number {
    return this._hpps;
  }

  get patchWidth(): number {
    return this.parent!.node!.clientWidth / this.hpps;
  }

  // /**
  //  * returns the 'left' offset of a strip relative to the start of the ribbon
  //  * @param  index of the strip
  //  * @return pixels
  //  */
  // getStripOffset(index: number): number {
  //   // @ts-expect-error error TS2341: Property '_items' is private
  //   return this._items[index]._left;
  // }

  // /**
  //  * Save current layout of the ribbon
  //  * @return new config object for current layout state
  //  *
  //  * use the returned object as input to restoreLayout later
  //  */
  // saveLayout(): CodeRibbonTheiaRibbonLayout.IRibbonLayoutConfig {
  //   crdebug("RibbonLayout saveLayout");
  //   return {
  //     stuff: "todo",
  //   };
  // }
  //
  // restoreLayout(config: CodeRibbonTheiaRibbonLayout.IRibbonLayoutConfig): void {
  //
  // }

  // NOTE === changing functionality of BoxLayout

  protected override onResize(msg: Widget.ResizeMessage): void {
    if (this.parent!.isVisible) {
      this.parent!.fit();
      // this._update(msg.width, msg.height);
    }
  }

  private override _fit(): void {
    // crdebug("RibbonLayout _fit");

    // Compute the visible item count.
    let nVisible = 0;
    // @ts-expect-error TS2341: Property is private
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // @ts-expect-error TS2341: Property is private
      nVisible += +!this._items[i].isHidden;
    }

    // Update the fixed space for the visible items.
    // @ts-expect-error TS2341: Property is private
    this._fixed = this._spacing * Math.max(0, nVisible - 1);

    // Setup the computed minimum size.
    // let horz = Private.isHorizontal(this._direction);
    let horz = true;
    // @ts-expect-error TS2341: Property is private
    let minW = horz ? this._fixed : 0;
    // @ts-expect-error TS2341: Property is private
    let minH = horz ? 0 : this._fixed;

    // Update the sizers and computed minimum size.
    // @ts-expect-error TS2341: Property is private
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // Fetch the item and corresponding box sizer.
      // @ts-expect-error TS2341: Property is private
      let item = this._items[i];
      // @ts-expect-error TS2341: Property is private
      let sizer = this._sizers[i];

      // If the item is hidden, it should consume zero size.
      if (item.isHidden) {
        sizer.minSize = 0;
        sizer.maxSize = 0;
        continue;
      }

      // Update the size limits for the item.
      item.fit();

      // Update the size basis and stretch factor.
      sizer.sizeHint = BoxLayout.getSizeBasis(item.widget);
      sizer.stretch = BoxLayout.getStretch(item.widget);

      // Update the sizer limits and computed min size.
      sizer.minSize = sizer.maxSize = this.patchWidth;
      minW += item.minWidth;
      minH = Math.max(minH, item.minHeight);
      // if (horz) {
      //   sizer.minSize = item.minWidth;
      //   sizer.maxSize = item.maxWidth;
      //   minW += item.minWidth;
      //   minH = Math.max(minH, item.minHeight);
      // } else {
      //   sizer.minSize = item.minHeight;
      //   sizer.maxSize = item.maxHeight;
      //   minH += item.minHeight;
      //   minW = Math.max(minW, item.minWidth);
      // }
    }

    // Update the box sizing and add it to the computed min size.
    // @ts-expect-error TS2341: Property is private
    let box = (this._box = ElementExt.boxSizing(this.parent!.node));
    minW += box.horizontalSum;
    minH += box.verticalSum;

    // Update the parent's min size constraints.
    let style = this.parent!.node.style;
    style.minWidth = `${minW}px`;
    style.minHeight = `${minH}px`;

    // Set the dirty flag to ensure only a single update occurs.
    // @ts-expect-error TS2341: Property is private
    this._dirty = true;

    // Notify the ancestor that it should fit immediately. This may
    // cause a resize of the parent, fulfilling the required update.
    if (this.parent!.parent) {
      MessageLoop.sendMessage(this.parent!.parent!, Widget.Msg.FitRequest);
    }

    // If the dirty flag is still set, the parent was not resized.
    // Trigger the required update on the parent widget immediately.
    // @ts-expect-error TS2341: Property is private
    if (this._dirty) {
      MessageLoop.sendMessage(this.parent!, Widget.Msg.UpdateRequest);
    }
  }

  private override _update(offsetWidth: number, offsetHeight: number): void {
    // crdebug("RibbonLayout _update");

    // Clear the dirty flag to indicate the update occurred.
    // @ts-expect-error TS2341: Property is private
    this._dirty = false;

    // Compute the visible item count.
    let nVisible = 0;
    // @ts-expect-error TS2341: Property is private
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // @ts-expect-error TS2341: Property is private
      nVisible += +!this._items[i].isHidden;
    }

    // Bail early if there are no visible items to layout.
    if (nVisible === 0) {
      return;
    }

    // Measure the parent if the offset dimensions are unknown.
    if (offsetWidth < 0) {
      offsetWidth = this.parent!.node.offsetWidth;
    }
    if (offsetHeight < 0) {
      offsetHeight = this.parent!.node.offsetHeight;
    }

    // Ensure the parent box sizing data is computed.
    // @ts-expect-error TS2341: Property is private
    if (!this._box) {
      // @ts-expect-error TS2341: Property is private
      this._box = ElementExt.boxSizing(this.parent!.node);
    }

    // Compute the layout area adjusted for border and padding.
    // @ts-expect-error TS2341: Property is private
    let top = this._box.paddingTop;
    // @ts-expect-error TS2341: Property is private
    let left = this._box.paddingLeft;
    // @ts-expect-error TS2341: Property is private
    let width = offsetWidth - this._box.horizontalSum;
    // @ts-expect-error TS2341: Property is private
    let height = offsetHeight - this._box.verticalSum;

    // Distribute the layout space and adjust the start position.
    let delta: number;
    // @ts-expect-error TS2341: Property is private
    switch (this._direction) {
      case "left-to-right":
        // @ts-expect-error TS2341: Property is private
        delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
        break;
      case "top-to-bottom":
        // @ts-expect-error TS2341: Property is private
        delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
        break;
      case "right-to-left":
        // @ts-expect-error TS2341: Property is private
        delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
        left += width;
        break;
      case "bottom-to-top":
        // @ts-expect-error TS2341: Property is private
        delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
        top += height;
        break;
      default:
        throw "unreachable";
    }

    // Setup the variables for justification and alignment offset.
    let extra = 0;
    let offset = 0;

    // Account for alignment if there is extra layout space.
    if (delta > 0) {
      // @ts-expect-error TS2341: Property is private
      switch (this._alignment) {
        case "start":
          break;
        case "center":
          extra = 0;
          offset = delta / 2;
          break;
        case "end":
          extra = 0;
          offset = delta;
          break;
        case "justify":
          extra = delta / nVisible;
          offset = 0;
          break;
        default:
          throw "unreachable";
      }
    }

    // Layout the items using the computed box sizes.
    // @ts-expect-error TS2341: Property is private
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // Fetch the item.
      // @ts-expect-error TS2341: Property is private
      let item = this._items[i];

      // Ignore hidden items.
      if (item.isHidden) {
        continue;
      }

      // Fetch the computed size for the widget.
      // @ts-expect-error TS2341: Property is private
      let size = this._sizers[i].size;

      // Update the widget geometry and advance the relevant edge.
      // @ts-expect-error TS2341: Property is private
      switch (this._direction) {
        case "left-to-right":
          item.update(left + offset, top, size + extra, height);
          // @ts-expect-error TS2341: Property is private
          left += size + extra + this._spacing;
          break;
        case "top-to-bottom":
          item.update(left, top + offset, width, size + extra);
          // @ts-expect-error TS2341: Property is private
          top += size + extra + this._spacing;
          break;
        case "right-to-left":
          item.update(left - offset - size - extra, top, size + extra, height);
          // @ts-expect-error TS2341: Property is private
          left -= size + extra + this._spacing;
          break;
        case "bottom-to-top":
          item.update(left, top - offset - size - extra, width, size + extra);
          // @ts-expect-error TS2341: Property is private
          top -= size + extra + this._spacing;
          break;
        default:
          throw "unreachable";
      }
    }
  }
}

export namespace CodeRibbonTheiaRibbonLayout {
  // export interface IRibbonLayoutConfig {
  //   type: 'ribbon-area'; // compatibility for dock*
  //   overview_active: boolean; // TODO: overview
  //   focus_active: boolean; // if strip is focused
  //   active_strip: number; // which strip is active
  //   children: CodeRibbonTheiaRibbonStrip[];
  // }
}
