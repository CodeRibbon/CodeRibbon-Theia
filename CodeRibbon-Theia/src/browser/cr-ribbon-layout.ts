import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
  BoxEngine, BoxSizer,
} from '@phosphor/widgets';
import {
  ElementExt,
} from '@phosphor/domutils';
import {
  Message, MessageLoop,
} from '@phosphor/messaging';
import {
  empty,
} from '@phosphor/algorithm';
import {
  MessageService,
  Emitter, environment,
  Disposable, DisposableCollection,
} from '@theia/core/lib/common';
import {
  TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID, MAXIMIZED_CLASS,
} from '@theia/core/lib/browser/shell/theia-dock-panel';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';

import { crdebug } from './CodeRibbon-logger';


@injectable()
export class CodeRibbonTheiaRibbonLayout extends BoxLayout {

  private override _fit(): void {
    crdebug("RibbonLayout _fit", this);

    // Compute the visible item count.
    let nVisible = 0;
    for (let i = 0, n = this._items.length; i < n; ++i) {
      nVisible += +!this._items[i].isHidden;
    }

    // Update the fixed space for the visible items.
    this._fixed = this._spacing * Math.max(0, nVisible - 1);

    // Setup the computed minimum size.
    // let horz = Private.isHorizontal(this._direction);
    let horz = true;
    let minW = horz ? this._fixed : 0;
    let minH = horz ? 0 : this._fixed;

    // Update the sizers and computed minimum size.
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // Fetch the item and corresponding box sizer.
      let item = this._items[i];
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
      sizer.minSize = 400;
      sizer.maxSize = 500;
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
    let box = this._box = ElementExt.boxSizing(this.parent!.node);
    minW += box.horizontalSum;
    minH += box.verticalSum;

    // Update the parent's min size constraints.
    let style = this.parent!.node.style;
    style.minWidth = `${minW}px`;
    style.minHeight = `${minH}px`;

    // Set the dirty flag to ensure only a single update occurs.
    this._dirty = true;

    // Notify the ancestor that it should fit immediately. This may
    // cause a resize of the parent, fulfilling the required update.
    if (this.parent!.parent) {
      MessageLoop.sendMessage(this.parent!.parent!, Widget.Msg.FitRequest);
    }

    // If the dirty flag is still set, the parent was not resized.
    // Trigger the required update on the parent widget immediately.
    if (this._dirty) {
      MessageLoop.sendMessage(this.parent!, Widget.Msg.UpdateRequest);
    }
  }

  private override _update(offsetWidth: number, offsetHeight: number): void {
    crdebug("RibbonLayout _update", this);

    // Clear the dirty flag to indicate the update occurred.
    this._dirty = false;

    // Compute the visible item count.
    let nVisible = 0;
    for (let i = 0, n = this._items.length; i < n; ++i) {
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
    if (!this._box) {
      this._box = ElementExt.boxSizing(this.parent!.node);
    }

    // Compute the layout area adjusted for border and padding.
    let top = this._box.paddingTop;
    let left = this._box.paddingLeft;
    let width = offsetWidth - this._box.horizontalSum;
    let height = offsetHeight - this._box.verticalSum;

    // Distribute the layout space and adjust the start position.
    let delta: number;
    switch (this._direction) {
    case 'left-to-right':
      delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
      break;
    case 'top-to-bottom':
      delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
      break;
    case 'right-to-left':
      delta = BoxEngine.calc(this._sizers, Math.max(0, width - this._fixed));
      left += width;
      break;
    case 'bottom-to-top':
      delta = BoxEngine.calc(this._sizers, Math.max(0, height - this._fixed));
      top += height;
      break;
    default:
      throw 'unreachable';
    }

    // Setup the variables for justification and alignment offset.
    let extra = 0;
    let offset = 0;

    // Account for alignment if there is extra layout space.
    if (delta > 0) {
      switch (this._alignment) {
      case 'start':
        break;
      case 'center':
        extra = 0;
        offset = delta / 2;
        break;
      case 'end':
        extra = 0;
        offset = delta;
        break;
      case 'justify':
        extra = delta / nVisible;
        offset = 0;
        break;
      default:
        throw 'unreachable';
      }
    }

    // Layout the items using the computed box sizes.
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // Fetch the item.
      let item = this._items[i];

      // Ignore hidden items.
      if (item.isHidden) {
        continue;
      }

      // Fetch the computed size for the widget.
      let size = this._sizers[i].size;

      // Update the widget geometry and advance the relevant edge.
      switch (this._direction) {
      case 'left-to-right':
        item.update(left + offset, top, size + extra, height);
        left += size + extra + this._spacing;
        break;
      case 'top-to-bottom':
        item.update(left, top + offset, width, size + extra);
        top += size + extra + this._spacing;
        break;
      case 'right-to-left':
        item.update(left - offset - size - extra, top, size + extra, height);
        left -= size + extra + this._spacing;
        break;
      case 'bottom-to-top':
        item.update(left, top - offset - size - extra, width, size + extra);
        top -= size + extra + this._spacing;
        break;
      default:
        throw 'unreachable';
      }
    }
  }

}