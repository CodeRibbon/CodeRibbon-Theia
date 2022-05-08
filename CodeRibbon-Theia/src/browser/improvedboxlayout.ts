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
  empty, IIterator, each, chain,
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


export class ImprovedBoxLayout extends BoxLayout {

  readonly handles: HTMLDivElement[] = [];
  readonly renderer: ImprovedBoxLayout.IRenderer;

  constructor(options: ImprovedBoxLayout.IOptions) {
    super((options as BoxLayout.IOptions));
    // NOTE differs from base: IOptions required renderer?
    this.renderer = options.renderer || DockPanel.defaultRenderer;
  }

  // saveLayout(): ???.ILayoutConfig {
  //   // TODO
  //   return {
  //     main: undefined,
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
   * @param handle   [description]
   * @param offsetX  [description]
   * @param offsetY  [description]
   *
   * mostly the same impl as DockLayout
   */
  moveHandle(handle: HTMLDivElement, offsetX: number, offsetY: number): void {
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

  // NOTE === changing functionality of BoxLayout

  protected onResize(msg: Widget.ResizeMessage): void {
    if (this.parent!.isVisible) {
      this.parent!.fit();
      // this._update(msg.width, msg.height);
    }
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
}

namespace Private {
  // dockpanel:
  // export type LayoutNode = TabLayoutNode | SplitLayoutNode;
  // we don't use that, we ARE the node...

  // in docklayout:
  export type Orientation = 'horizontal' | 'vertical';

}
