import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
} from '@phosphor/widgets';
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
import { CodeRibbonTheiaPatch } from './cr-patch';


export
namespace RibbonStrip {
  export
  type InsertMode = (
    // Place a new patch above or below the current one in this column
    'split-down' |
    'split-up' |

    // Place a new patch at the top or bottom of this column
    'split-top' |
    'split-bottom' |

    // Create a new column on the right or left of the current, put widget there
    'split-right' |
    'split-left' |

    // Remove active item, replace
    'replace-current'
  )
  export
  interface IAddOptions {
    /**
     * Options for inserting a Widget onto the RibbonStrip
     */
    mode?: InsertMode;
    /**
     * If a widget reference is specified here, perform the insert relative
     * to that widget instead of the active one.
     */
    ref?: Widget | null;
    /**
     * If true, the insertion will overwrite an empty Patch if there is already
     * one in the target insertion location
     */
    useEmpty?: boolean;
  }
  export
  interface IOptions {
    // how many empty patches to init
    size?: int;
  }
}

// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
@injectable()
export class CodeRibbonTheiaRibbonStrip extends BoxPanel {

  /**
   * Emitted when a widget is added to the panel.
   */
  readonly widgetAdded = new Signal<this, Widget>(this);
  /**
   * Emitted when a widget is activated by calling `activateWidget`.
   */
  readonly widgetActivated = new Signal<this, Widget>(this);
  /**
   * Emitted when a widget is removed from the panel.
   */
  readonly widgetRemoved = new Signal<this, Widget>(this);

  // protected readonly onDidToggleMaximizedEmitter = new Emitter<Widget>();
  // readonly onDidToggleMaximized = this.onDidToggleMaximizedEmitter.event;

  constructor(options?: RibbonStrip.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    super({
      alignment: 'start',
      direction: 'top-to-bottom',
      // spacing:
    });
    this.addClass('p-RibbonStrip');
    crdebug("RibbonStrip constructor:", this, options);
  }

  init() {
    crdebug("Strip init", this);

    // while (this.widgets.length < this.vpps) {
    for (let i = 0; i < 2; ++i) {
      crdebug("adding patch to meet vpps ...");
      let new_patch = this.createPatch();
    }
  }

  get vpps(): int {
    return 2; // TODO
  }

  protected get _patches(): Iterable<CodeRibbonTheiaPatch> {
    // TODO filter to Patches?
    return (this.layout as BoxLayout).widgets;
  }

  // TODO options
  createPatch(options?: any = {}) {
    let new_patch = new CodeRibbonTheiaPatch();
    super.addWidget(new_patch);
    new_patch.init();
    return new_patch;
  }

  override addWidget(widget: Widget, options?: RibbonPanel.IAddOptions): void {
    // TODO logic based on where to put the widget
    // super.addWidget(widget);

    let target_patch = this._patches.find(patch => {
      return patch.contentful_size == 0;
    });
    if (!target_patch) {
      target_patch = this.createPatch(options);
    }
    target_patch.addWidget(widget);

    this.widgetAdded.emit(widget);
  }

  // TODO is this actually an override?
  activateWidget(widget: Widget): void {
    // TODO focus the widget, scrolling, etc...
    crdebug("RibbonStrip activateWidget", widget);
    // super.activate();
    // TODO column's activate first
    widget.activate();
    this.widgetActivated.emit(widget);
  }

  get contentful_size() {
    // TODO don't count cr-placeholder widgets
    // return (this.layout as BoxLayout).widgets.length;

    let contentful_patches = 0;
    this.widgets().forEach((patch) => {
      contentful_patches += patch.contentful_size;
    });

    return contentful_patches;
  }

  has_empty_patch() {
    // TODO
    if (this.contentful_size < 2) {
      return true;
    }
    else {
      return false;
    }
  }

  // get ribbonOffsetLeft(): number {
  //   let rect = this.node?.getBoundingClientRect();
  //   let parent_rect = this.node?.offsetParent.getBoundingClientRect();
  // }

  // NOTE === phosphor DockPanel API compatility section === NOTE //
  // we might want to split this into a `ImprovedBoxPanel` class instead?
  // this section is because phosphor's BoxPanel has only a tiny fraction of the
  // features that DockPanel has, and they're expected by Theia

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  restoreLayout(config: BoxLayout.ILayoutConfig): void {
    // TODO
  }

  widgets(): IIterator<Widget> {
    // TODO iterate widgets in order of ribbon layout
    return (this.layout as BoxLayout).widgets;
  }

  // TODO signal connections from columns
  readonly _layoutModified = new Signal<this>(this);
  get layoutModified() {
    return this._layoutModified;
  }

  // overriding BoxPanel's p-BoxPanel-child
  override onChildAdded(msg) {
    msg.child.addClass('p-RibbonStrip-child');
  }
  override onChildRemoved(msg) {
    msg.child.removeClass('p-RibbonStrip-child');
  }

  // NOTE === theia DockPanel API compatility section === NOTE //

  isElectron(): boolean {
    return environment.electron.is();
  }

  protected readonly toDisposeOnMarkAsCurrent = new DisposableCollection();
  markAsCurrent(title: Title<Widget> | undefined): void {
    this.toDisposeOnMarkAsCurrent.dispose();
    this._currentTitle = title;
    if (title) {
      const resetCurrent = () => this.markAsCurrent(undefined);
      title.owner.disposed.connect(resetCurrent);
      this.toDisposeOnMarkAsCurrent.push(Disposable.create(() =>
        title.owner.disposed.disconnect(resetCurrent)
      ));
    }
  }

  protected _currentTitle: Title<Widget> | undefined;
  get currentTitle(): Title<Widget> | undefined {
    return this._currentTitle;
  }

  protected override onChildRemoved(msg: Widget.ChildMessage): void {
    super.onChildRemoved(msg);
    this.widgetRemoved.emit(msg.child);
  }

}
