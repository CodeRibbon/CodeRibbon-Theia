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
import { CodeRibbonTheiaRibbonStrip } from './cr-ribbon-strip';

// was not exported from TheiaDockPanel for some reason?
const VISIBLE_MENU_MAXIMIZED_CLASS = 'theia-visible-menu-maximized';


export
namespace RibbonPanel {
  export
  type InsertMode = (
    // At the tail of the ribbon:
    // the empty patch directly following the last/rightmost contentful patch
    'ribbon-tail' |

    // Place a new patch above or below the current one in this column
    'split-down' |
    'split-up' |

    // Place a new patch at the top or bottom of this column
    'split-top' |
    'split-bottom' |

    // Create a new column on the right or left of the current, put widget there
    'split-right' |
    'split-left' |

    // Place the widget such that it ends up in either the right or left
    // on-screen column, creating a new one if no empty patches are available
    'screen-right' |
    'screen-left'
  )
  export
  interface IAddOptions {
    /**
     * Options for inserting a Widget onto the Ribbon, when undefined the user's
     * preference will be used
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
}

// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
@injectable()
export class CodeRibbonTheiaRibbonPanel extends BoxPanel {

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

  protected readonly onDidToggleMaximizedEmitter = new Emitter<Widget>();
  readonly onDidToggleMaximized = this.onDidToggleMaximizedEmitter.event;

  constructor(options?: BoxPanel.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    super(options);
    crdebug("Ribbon constructor:", this, options);
    // if (preferences) {
    //   preferences.onPreferenceChanged(preference => {
    //     crdebug("ribbon: preference change:", preference);
    //   });
    // }
    // TODO debugging only
    if (!window.cr_ribbon) {
      window.cr_ribbon = this;
    }
    else {
      crdebug("WARNING: multiple ribbon constructions?");
    }

    // TODO restore this
    this._stripquota = 4;
  }

  override addWidget(widget: Widget, options?: RibbonPanel.IAddOptions): void {

    this.autoAdjustRibbonTailLength();

    // TODO logic based on where to put the widget
    let strip = this._rightmost_contentful_strip;
    if (!strip.has_empty_patch()) {
      strip = this.get_sibling(strip, 'right');
    }
    strip.addWidget(widget);

    // super.addWidget(widget);
    this.widgetAdded.emit(widget);
    crdebug("RibbonPanel Added widget", widget);
  }

  // TODO is this actually an override?
  activateWidget(widget: Widget): void {
    // TODO focus the widget, scrolling, etc...
    crdebug("RibbonPanel activateWidget", widget);
    // super.activate();
    // TODO column's activate first
    widget.activate();
    this.widgetActivated.emit(widget);
  }

  protected createNewRibbonStrip(
    index?: int | undefined, options?: RibbonStrip.IOptions
  ) {
    if (index === undefined) {
      // append to ribbon
      let new_strip = new CodeRibbonTheiaRibbonStrip();
      super.addWidget(new_strip);
      return new_strip;
    }
    else {
      console.error("not yet, TODO");
    }
  }

  protected autoAdjustRibbonTailLength() {
    crdebug("doin some work...");

    let strips = this._strips;
    if (strips.length < 1) {
      // create first RibbonStrip
      crdebug("Creating first Strip in Ribbon...");
      let new_strip = this.createNewRibbonStrip();
    }

    let rightmost_strip = this._strips[this._strips.length-1];
    if (rightmost_strip.contentful_size) {
      let new_strip = this.createNewRibbonStrip();
    }
  }

  protected get _rightmost_contentful_strip() {
    if (this._strips.length == 0) return undefined;

    let strip = undefined;
    for (let i=this._strips.length-1; i >= 0; i--) {
      strip = this._strips[i];
      if (strip.contentful_size) {
        break;
      }
    }

    return strip;
  }

  get_sibling(ref: CodeRibbonTheiaRibbonStrip, side) {
    const ref_idx = this._strips.indexOf(ref);
    if (ref_idx == -1) {
      crdebug("get_sibling: ref passed not in strips?", ref);
      return undefined;
    }

    switch (side) {
      case 'before':
      case 'left':
        if (ref_idx <= 0) {
          return undefined;
        }
        return this._strips[ref_idx - 1];
      case 'after':
      case 'right':
        if ((ref_idx + 1) >= this._strips.length) {
          return undefined;
        }
        return this._strips[ref_idx + 1];
      default:
        throw new Error("get_sibling invalid side:", side);
    }
  }

  protected get _strips() {
    return (this.layout as BoxLayout).widgets;
  }

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
    // TODO iterate widgets in order of ribbon layout from within strips
    return (this.layout as BoxLayout).widgets;
  }

  tabBars(): IIterator<TabBar<Widget>> {
    // TODO removal of tabBars
    return this._root ? this._root.iterTabBars() : empty<TabBar<Widget>>();
  }

  // TODO signal connections from columns
  readonly _layoutModified = new Signal<this>(this);
  get layoutModified() {
    return this._layoutModified;
  }

  // overriding BoxPanel's p-BoxPanel-child
  override onChildAdded(msg) {
    msg.child.addClass('p-RibbonPanel-child');
  }
  override onChildRemoved(msg) {
    msg.child.removeClass('p-RibbonPanel-child');
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

  protected maximizedElement: HTMLElement | undefined;
  protected getMaximizedElement(): HTMLElement {
    if (!this.maximizedElement) {
      this.maximizedElement = document.createElement('div');
      this.maximizedElement.style.display = 'none';
      document.body.appendChild(this.maximizedElement);
    }
    return this.maximizedElement;
  }

  protected handleMenuBarVisibility(newValue: string): void {
    const areaContainer = this.node.parentElement;
    const maximizedElement = this.getMaximizedElement();

    if (areaContainer === maximizedElement) {
      if (newValue === 'visible') {
        this.addClass(VISIBLE_MENU_MAXIMIZED_CLASS);
      } else {
        this.removeClass(VISIBLE_MENU_MAXIMIZED_CLASS);
      }
    }
  }

  protected _currentTitle: Title<Widget> | undefined;
  get currentTitle(): Title<Widget> | undefined {
    return this._currentTitle;
  }

  get currentTabBar(): TabBar<Widget> | undefined {
    // TODO removal of tab bars
    return this._currentTitle && this.findTabBar(this._currentTitle);
  }

  findTabBar(title: Title<Widget>): TabBar<Widget> | undefined {
    return find(
      this.tabBars(), // original of DockPanel, replacement made for BoxPanel
      bar => ArrayExt.firstIndexOf(bar.titles, title) > -1
    );
  }

  protected override onChildRemoved(msg: Widget.ChildMessage): void {
    super.onChildRemoved(msg);
    this.widgetRemoved.emit(msg.child);
  }

  // TODO tab bar removal
  /**
   * IDEA: swap TabBar for a column or strip method API?
   * @param  widget               [description]
   * @return        [description]
   */
  nextTabBarWidget(widget: Widget): Widget | undefined {
    const current = this.findTabBar(widget.title);
    const next = current && this.nextTabBarInPanel(current);
    return next && next.currentTitle && next.currentTitle.owner || undefined;
  }

  // TODO tab bar removal
  nextTabBarInPanel(tabBar: TabBar<Widget>): TabBar<Widget> | undefined {
    const tabBars = toArray(this.tabBars()):
    const index = tabBars.indexOf(tabBar);
    if (index !== -1) {
      return tabBars[index + 1];
    }
    return undefined;
  }

  previousTabBarWidget(widget: Widget): Widget | undefined {
    const current = this.findTabBar(widget.title);
    const previous = current && this.previousTabBarInPanel(current);
    return previous && previous.currentTitle && previous.currentTitle.owner || undefined;
  }

  previousTabBarInPanel(tabBar: TabBar<Widget>): TabBar<Widget> | undefined {
    const tabBars = toArray(this.tabBars());
    const index = tabBars.indexOf(tabBar);
    if (index !== -1) {
      return tabBars[index - 1];
    }
    return undefined;
  }

  protected readonly toDisposeOnToggleMaximized = new DisposableCollection();
  toggleMaximized(): void {
    // TODO ribbon elements stacking order:
    const areaContainer = this.node.parentElement;
    if (!areaContainer) {
      return;
    }
    const maximizedElement = this.getMaximizedElement();
    if (areaContainer === maximizedElement) {
      this.toDisposeOnToggleMaximized.dispose();
      return;
    }
    if (this.isAttached) {
      // TODO what is this really doing???
      UnsafeWidgetUtilities.detach(this);
    }
    maximizedElement.style.display = 'block';
    this.addClass(MAXIMIZED_CLASS);
    const preference = this.preferences?.get('window.menuBarVisibility');
    if (!this.isElectron() && preference === 'visible') {
      this.addClass(VISIBLE_MENU_MAXIMIZED_CLASS);
    }
    UnsafeWidgetUtilities.attach(this, maximizedElement);
    this.fit();
    this.onDidToggleMaximizedEmitter.fire(this);
    this.toDisposeOnToggleMaximized.push(Disposable.create(() => {
      maximizedElement.style.display = 'none';
      this.removeClass(MAXIMIZED_CLASS);
      this.onDidToggleMaximizedEmitter.fire(this);
      if (!this.isElectron()) {
        this.removeClass(VISIBLE_MENU_MAXIMIZED_CLASS);
      }
      if (this.isAttached) {
        UnsafeWidgetUtilities.detach(this);
      }
      UnsafeWidgetUtilities.attach(this, areaContainer);
      this.fit();
    }));

    // TODO NOTE mod to BoxLayout?
    const layout = this.layout;
    if (layout instanceof DockLayout || layout instanceof BoxLayout) {
      crdebug("in toggleMaximized, layout is", layout);

      const onResize = layout['onResize'];
      layout['onResize'] = () => onResize.bind(layout)(Widget.ResizeMessage.UnknownSize);
      this.toDisposeOnToggleMaximized.push(Disposable.create(() => layout['onResize'] = onResize));
    }

    const removedListener = () => {
      if (!this.widgets().next()) {
        this.toDisposeOnToggleMaximized.dispose();
      }
    };
    this.widgetRemoved.connect(removedListener);
    this.toDisposeOnToggleMaximized.push(Disposable.create(() => this.widgetRemoved.disconnect(removedListener)));
  }

  protected maximizedElement: HTMLElement | undefined;
  protected getMaximizedElement(): HTMLElement {
    if (!this.maximizedElement) {
      this.maximizedElement = document.createElement('div');
      this.maximizedElement.style.display = 'none';
      document.body.appendChild(this.maximizedElement);
    }
    return this.maximizedElement;
  }

}
