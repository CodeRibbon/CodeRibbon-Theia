import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
  BoxEngine, BoxSizer,
  LayoutItem,
} from '@phosphor/widgets';
import {
  ElementExt,
} from '@phosphor/domutils';
import {
  Message, MessageLoop,
} from '@phosphor/messaging';
import {
  empty, IIterator, each, chain, ArrayExt, reduce,
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

import { crdebug } from './cr-logger';


// @ts-expect-error Class 'ImprovedBoxLayout' incorrectly extends base class 'BoxLayout'. Property '_update' is private in type 'BoxLayout' but not in type 'ImprovedBoxLayout'.
export class ImprovedBoxLayout extends BoxLayout {

  readonly handles: HTMLDivElement[] = [];
  readonly renderer: ImprovedBoxLayout.IRenderer;
  normalized: boolean = false;

  constructor(options: ImprovedBoxLayout.IOptions) {
    super((options as BoxLayout.IOptions));
    // NOTE differs from base: IOptions required renderer?
    this.renderer = options.renderer || DockPanel.defaultRenderer;
  }

  protected init(): void {
    super.init();

    // each(this, widget => {
    //   this.attachWidget( widget);
    // });

    each(this.handles, handle => { this.parent!.node.appendChild(handle); });

    this.parent!.fit();
  }

  // get widgets(): Widget[] {
  //   return super.widgets;
  // }

  addWidget(widget: Widget, options: ImprovedBoxLayout.IAddOptions = {}): void {
    crdebug("IBL addWidget()", this, widget, options);

    let index = (typeof options.index === 'undefined') ? this.widgets.length : options.index;

    // fix override to PanelLayout addWidget:
    this.insertWidget(index, widget);

    // NOTE _insertSplit emulation START
    // _insertSplit(widget, ref, refNode, 'horiz/vert', after: bool)
    // logic to add the split
    this.normalizeSizes();
    // ArrayExt.insert(this._items, index, new LayoutItem(widget));
    // ArrayExt.insert(this._sizers, index, new BoxSizer());
    ArrayExt.insert(this.handles, index, this._createHandle());

    this.syncHandles();

    // NOTE _insertSplit emulation END

    if (!this.parent) return;

    // NOTE called by PanelLayout.insertWidget
    // this.attachWidget(index, widget);

    this.parent.fit();
  }

  // saveLayout(): ImprovedBoxLayout.ILayoutConfig {
  //   crdebug("IBL saveLayout, widgets:", this.widgets);
  //   return {
  //     orientation: this.orientation,
  //     // TODO: this should be normalized instead...
  //     // sizers: this._sizers,
  //     // widgets: this.widgets,
  //   };
  // }

  // iterHandles(): IIterator<HTMLDivElement> {
  //   // TODO this iterates my own handles, then the handles of any below me
  //
  //   // as dockpanel:
  //   // let children = map(this.children, child => child.iterHandles());
  //   // return chain(this.handles, new ChainIterator<HTMLDivElement>(children));
  //
  //   // TODO for now:
  //   // return IIterator<HTMLDivElement>(this.handles);
  // }

  /**
   * sync visibility and direction of the handles
   */
  syncHandles(): void {
    each(this.handles, (handle, i) => {
      handle.setAttribute('data-orientation', this.orientation);
      if (i === this.handles.length - 1) {
        handle.classList.add('p-mod-hidden');
      } else {
        handle.classList.remove('p-mod-hidden');
      }
    });
  }

  update(left: number, top: number, width: number, height: number, spacing: number) {
    crdebug("IBL update()", this, left, top, width, height, spacing);
    crdebug("IBL update() START: normalized sizes are currently", this.getNormalizedSizes(), this.getNormalizedSizeHints());
    let horizontal = this.orientation === 'horizontal';
    // @ts-expect-error TS2341: _items is private
    let fixed = Math.max(0, this._items.length - 1) * spacing;
    let space = Math.max(0, (horizontal ? width : height) - fixed);

    if (space == 0) {
      crdebug("ERROR: I am 99.9% sure that we should NOT update the IBL with 0 space, so I won't.");
      //
      return;
    }

    // De-normalize the sizes if needed.
    if (this.normalized) {
      crdebug("IBL update(): need to de-normalize sizers")
      // @ts-expect-error TS2341: _sizers is private
      each(this._sizers, (sizer: BoxSizer, i) => {
        // @ts-ignore debugging statement
        crdebug(`sizer ${i} was ${sizer.sizeHint} before, ${sizer.sizeHint*space} after`);
        sizer.sizeHint *= space;
      });
      this.normalized = false;
    }
    crdebug("IBL update(): normalized sizes are currently", this.getNormalizedSizes(), this.getNormalizedSizeHints());

    // Distribute the layout space to the sizers.
    // @ts-expect-error TS2341: _sizers is private
    BoxEngine.calc(this._sizers, space);

    // Update the geometry of the child nodes and handles.
    // @ts-expect-error TS2341: _items is private
    for (let i = 0, n = this._items.length; i < n; ++i) {
      // let child = this.children[i];
      // @ts-expect-error TS2341: _sizers is private
      let size = this._sizers[i].size;
      let handleStyle = this.handles[i].style;
      if (horizontal) {
        // child.update(left, top, size, height, spacing, items);
        left += size;
        handleStyle.top = `${top}px`;
        handleStyle.left = `${left}px`;
        handleStyle.width = `${spacing}px`;
        handleStyle.height = `${height}px`;
        left += spacing;
      } else {
        // child.update(left, top, width, size, spacing, items);
        top += size;
        handleStyle.top = `${top}px`;
        handleStyle.left = `${left}px`;
        handleStyle.width = `${width}px`;
        handleStyle.height = `${spacing}px`;
        top += spacing;
      }
    }

    crdebug("IBL update() END: normalized sizes are currently", this.getNormalizedSizes(), this.getNormalizedSizeHints());
  }

  protected _update(offsetWidth: number, offsetHeight: number): void {
    // @ts-expect-error TS2341: _update is private
    super._update(offsetWidth, offsetHeight);

    if (offsetWidth < 0) offsetWidth = this.parent!.node.offsetWidth;
    if (offsetHeight < 0) offsetHeight = this.parent!.node.offsetHeight;

    // @ts-expect-error TS2341: _box is private
    if (!this._box) {
      // @ts-expect-error TS2341: _box is private
      this._box = ElementExt.boxSizing(this.parent!.node);
    }
    // @ts-expect-error TS2341: _box is private
    let x = this._box.paddingTop;
    // @ts-expect-error TS2341: _box is private
    let y = this._box.paddingLeft;
    // @ts-expect-error TS2341: _box is private
    let width = offsetWidth - this._box.horizontalSum;
    // @ts-expect-error TS2341: _box is private
    let height = offsetHeight - this._box.verticalSum;

    // @ts-expect-error TS2341: _spacing is private
    this.update(x, y, width, height, this._spacing);
  }

  // in docklayout:
  // readonly orientation: Orientation;
  get orientation(): Private.Orientation {
    // function because based on direction of boxlayout
    // @ts-expect-error TS2341: this._direction is private
    switch (this._direction) {
      case 'top-to-bottom':
      case 'bottom-to-top':
        return 'vertical';
      case 'left-to-right':
      case 'right-to-left':
        return 'horizontal';
      default:
        throw Error("Invalid _direction of BoxLayout");
    }
  }

  /**
   * move handle to a given offset position
   * @param handle   handle to move
   * @param offsetX  desired offset X of handle
   * @param offsetY  desired offset Y of handle
   *
   * mostly the same impl as DockLayout
   */
  moveHandle(handle: HTMLDivElement, offsetX: number, offsetY: number): void {
    crdebug("IBL: moveHandle", handle, offsetX, offsetY);
    if (handle.classList.contains('p-mod-hidden')) {
      crdebug("Trying to move a hidden handle???");
      return;
    }

    // TODO check that handle belongs to this boxlayout?

    let delta: number;
    if (this.orientation === 'horizontal') {
      delta = offsetX - handle.offsetLeft;
    } else {
      delta = offsetY - handle.offsetTop;
    }

    if (delta === 0) {
      return;
    }

    // data.node.holdSizes()
    this.holdSizes();

    BoxEngine.adjust(
      // @ts-expect-error TS2341: _sizers is private
      this._sizers,
      0, // data.index // TODO fix to actual index of handle
      delta
    );

    if (this.parent) {
      this.parent.update();
    }
  }

  private _createHandle(): HTMLDivElement {
    let handle = this.renderer.createHandle();

    let style = handle.style;
    style.position = 'absolute';
    style.top = '0';
    style.left = '0';
    style.width = '0';
    style.height = '0';

    if (this.parent) {
      this.parent.node.appendChild(handle);
    }

    return handle;
  }

  /**
   * used by moveHandle to hold resize adjustments made by user
   */
  holdSizes(): void {
    // crdebug("IBL: holdSizes()");
    // @ts-expect-error TS2341: is private
    each(this._sizers, (sizer: BoxSizer) => {
      sizer.sizeHint = sizer.size;
    });
  }

  normalizeSizes(): void {
    // @ts-expect-error TS2341: is private
    let n = this._sizers.length;
    if (n === 0) {
      return;
    }

    this.holdSizes();

    // @ts-expect-error TS2341: is private
    let sum = reduce(this._sizers, (v, sizer) => v + sizer.sizeHint, 0);

    // normalize based on sum
    if (sum === 0) {
      // @ts-expect-error TS2341: is private
      each(this._sizers, (sizer: BoxSizer) => {
        sizer.size = sizer.sizeHint = 1 / n;
      });
    } else {
      // @ts-expect-error TS2341: is private
      each(this._sizers, (sizer: BoxSizer) => {
        sizer.size = sizer.sizeHint /= sum;
      });
    }

    this.normalized = true;
  }

  // NOTE === changing functionality of BoxLayout

  protected onResize(msg: Widget.ResizeMessage): void {
    // crdebug("IBL: onResize", msg);
    if (this.parent!.isVisible) {
      // this.parent!.fit();
      this._update(msg.width, msg.height);
    }
  }

  /**
   * https://github.com/phosphorjs/phosphor/blob/master/packages/widgets/src/docklayout.ts#L1879
   * @return the sizes normalized to a sum of 1.0
   */
  getNormalizedSizes(): number[] {
    // this.normalizeSizes();
    //
    // // @ ts-expect-error TS2341: _sizers is private
    // let sizes = this._sizers.map(sizer => sizer.size);
    //
    // return sizes;

    // @ts-expect-error TS2341: _sizers is private
    let n = this._sizers.length;
    if (n === 0) return [];

    // @ts-expect-error TS2341: _sizers is private
    let sizes: number[] = this._sizers.map(sizer => (sizer as BoxSizer).size);
    let sum = reduce(sizes, (v, size: number) => v + size, 0);

    if (sum === 0) {
      each(sizes, (size, i) => { sizes[i] = 1 / n; });
    } else {
      each(sizes, (size, i) => { sizes[i] = size / sum; });
    }

    return sizes;
  }

  getNormalizedSizeHints(): number[] {
    // @ts-expect-error TS2341: _sizers is private
    let n = this._sizers.length;
    if (n === 0) return [];

    // @ts-expect-error TS2341: _sizers is private
    let sizes: number[] = this._sizers.map(sizer => sizer.sizeHint);
    let sum = reduce(sizes, (v, size) => v + size, 0);

    if (sum === 0) {
      each(sizes, (size, i) => { sizes[i] = 1 / n; });
    } else {
      each(sizes, (size, i) => { sizes[i] = size / sum; });
    }

    return sizes;
  }

  restoreNormalizedSizes(sizes: number[]): void {
    // @ts-expect-error TS2341: _sizers is private
    if (sizes.length != this._sizers.length) {
      throw Error("Wrong number of normalized sizes to restore onto a box layout");
    }

    for (let i = 0; i < sizes.length; i++) {
      let new_sizer = Private.createSizer(sizes[i]);
      // @ts-expect-error TS2341: _sizers is private
      crdebug(`old sizer: ${JSON.stringify(this._sizers[i])}, new: ${JSON.stringify(new_sizer)}`);
      // @ts-expect-error TS2341: _sizers is private
      this._sizers[i] = new_sizer;
      // // @ ts-expect-error TS2341: _sizers is private
      // this._sizers[i].size = sizes[i];
      // // @ ts-expect-error TS2341: _sizers is private
      // this._sizers[i].sizeHint = sizes[i];
    }
    this.normalized = true;

    // @ts-expect-error TS2341: _sizers is private
    crdebug("restoreNormalizedSizes created new BoxSizers, first:", this._sizers[0]);

    // this._update(-1, -1);
    // this.holdSizes();

    // if (this.parent) {
    //   this.parent.update();
    // }
  }

}

export namespace ImprovedBoxLayout {
  export interface IRenderer {
    // does NOT include createTabBar()
    /**
     * Creates a new handle
     * @return A new handle node for the layout
     */
    createHandle(): HTMLDivElement;
  }

  export interface IOptions {
    // docklayout
    renderer?: IRenderer | DockLayout.IRenderer;
    // boxlayout
    direction?: BoxLayout.Direction;
    alignment?: BoxLayout.Alignment;
    // common
    spacing?: number;
  }

  /**
   * options for adding a widget
   */
  export interface IAddOptions {
    index?: number;
  }

  export interface ILayoutConfig {
    orientation: Private.Orientation;
    sizers: BoxSizer[];
    widgets: Widget[];
  }
}

namespace Private {
  // dockpanel:
  // export type LayoutNode = TabLayoutNode | SplitLayoutNode;
  // we don't use that, we ARE the node...

  // in docklayout:
  export type Orientation = 'horizontal' | 'vertical';

  export function createSizer(hint: number): BoxSizer {
    let sizer = new BoxSizer();
    sizer.sizeHint = hint;
    sizer.size = hint;
    return sizer;
  }
}
