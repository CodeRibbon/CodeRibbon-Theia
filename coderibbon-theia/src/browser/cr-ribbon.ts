import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel, Panel,
  DockLayout, BoxLayout,
} from '@phosphor/widgets';
import {
  empty, toArray, ArrayExt, IIterator, find, iter,
} from '@phosphor/algorithm';
import {
  MessageLoop,
} from '@phosphor/messaging';
import {
  MessageService,
  Emitter, environment,
  Disposable, DisposableCollection,
} from '@theia/core/lib/common';
import {
  UnsafeWidgetUtilities,
} from '@theia/core/lib/browser/widgets';
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
import { CodeRibbonTheiaPatch } from './cr-patch';
import { CodeRibbonTheiaRibbonStrip } from './cr-ribbon-strip';
import { CodeRibbonTheiaRibbonLayout } from './cr-ribbon-layout';
import { RibbonPanel, RibbonStrip } from './cr-interfaces';

// was not exported from TheiaDockPanel for some reason?
const VISIBLE_MENU_MAXIMIZED_CLASS = 'theia-visible-menu-maximized';


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

  protected _stripquota: number;

  constructor(options?: RibbonPanel.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    // @ts-expect-error TS2322: Type 'CodeRibbonTheiaRibbonLayout' is not assignable to type 'BoxLayout'.
    super({ layout: Private.createLayout(options) });
    // Replaced super call with super.super,
    // Panel.prototype.constructor.call(
    //   this, {layout: Private.createLayout(options)}
    // );
    this.addClass('p-RibbonPanel');

    crdebug("Ribbon constructor:", this, options);
    // if (preferences) {
    //   preferences.onPreferenceChanged(preference => {
    //     crdebug("ribbon: preference change:", preference);
    //   });
    // }
    // TODO debugging only
    // @ts-expect-error TS2339: Property does not exist on type
    if (!window.cr_ribbon) {
      // @ts-expect-error TS2339: Property does not exist on type
      window.cr_ribbon = this;
    }
    else {
      crdebug("WARNING: multiple ribbon constructions?");
    }

    // TODO restore this
    this._stripquota = 4;

    this.autoAdjustRibbonTailLength();
  }

  override addWidget(widget: Widget, options?: RibbonPanel.IAddOptions): void {

    this.autoAdjustRibbonTailLength();

    // TODO logic based on where to put the widget
    let strip = this._rightmost_contentful_strip;
    if (!strip) strip = this._strips[0];
    if (!strip.has_empty_patch()) {
      strip = this.get_sibling(strip!, 'right');
    }
    strip!.addWidget(widget);

    // super.addWidget(widget);
    this.widgetAdded.emit(widget);
    crdebug("RibbonPanel Added widget", widget);

    this.autoAdjustRibbonTailLength();
  }

  // TODO is this actually an override?
  activateWidget(widget: Widget): void {
    // TODO focus the widget, scrolling, etc...
    crdebug("RibbonPanel activateWidget", widget);
    // super.activate();
    // TODO column's activate first
    if (widget instanceof CodeRibbonTheiaPatch) {
      let strip = widget.parent;
      if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
        crdebug("patch not parented by strip:", widget);
        throw Error("Patch not parented by Strip");
      }
      this.scrollStripIntoView((strip as CodeRibbonTheiaRibbonStrip)).then(() => {
        widget.activate();
        this.widgetActivated.emit(widget);
      }).catch((e) => {
        crdebug("scrollStripIntoView fail reason:", e);
        throw Error("Failed to scrollStripIntoView");
      });
    }
    else if (widget instanceof CodeRibbonTheiaRibbonStrip) {
      this.scrollStripIntoView(widget).then(() => {
        widget.activate();
        this.widgetActivated.emit(widget);
      }).catch((e) => {
        crdebug("scrollStripIntoView fail reason:", e);
        throw Error("Failed to scrollStripIntoView");
      });
    }
    else {
      let w_parent = widget.parent;
      while (w_parent!.parent!) {
        if (w_parent instanceof CodeRibbonTheiaPatch) {
          let strip = w_parent.parent;
          if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
            crdebug("patch without strip as parent:", w_parent);
            throw Error("Patch not parented by Strip");
          }
          this.scrollStripIntoView((strip as CodeRibbonTheiaRibbonStrip)).then(() => {
            widget.activate();
            this.widgetActivated.emit(widget);
          }).catch((e) => {
            crdebug("scrollStripIntoView failure:", e);
            throw Error("Failed to scrollStripIntoView");
          });
          break;
        }
        w_parent = w_parent!.parent;
      }
      if (! w_parent!.parent) {
        widget.activate();
        this.widgetActivated.emit(widget);
        crdebug("error on widget:", widget);
        throw Error("not sure how to activate widget outside known Ribbon component");
      }
    }

  }

  protected createNewRibbonStrip(
    index?: number | undefined, options?: RibbonStrip.IOptions
  ) {
    if (index === undefined) {
      // append to ribbon
      let new_strip = new CodeRibbonTheiaRibbonStrip();
      super.addWidget(new_strip);
      // crdebug("New strip created, init...");
      new_strip.cr_init();
      return new_strip;
    }
    else {
      console.error("not yet, TODO");
      throw Error("NotYetImplemented");
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

    if (strips.length < (this.layout as CodeRibbonTheiaRibbonLayout).hpps) {
      // ensure at least one screen of initial patches
      let toAdd = (this.layout as CodeRibbonTheiaRibbonLayout).hpps - strips.length;
      let new_strips = Array(toAdd).fill(0).map((_n) => {
        this.createNewRibbonStrip();
      });
    }
  }

  protected get _rightmost_contentful_strip(): CodeRibbonTheiaRibbonStrip | undefined {
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

  set scrollLeft(value: number) {
    // TODO
  }
  get scrollLeft(): number {
    return this.node?.scrollLeft;
  }

  get_sibling(ref: CodeRibbonTheiaRibbonStrip, side: string) {
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
        throw new Error("get_sibling invalid side:" + side);
    }
  }

  protected get _strips(): readonly CodeRibbonTheiaRibbonStrip[] {
    return (
      (this.layout as CodeRibbonTheiaRibbonLayout).widgets as readonly CodeRibbonTheiaRibbonStrip[]
    );
  }

  get contentful_widgets(): readonly Widget[] {
    // TODO TypeScript can't understand flat() operation???
    return (this._strips.map((strip: CodeRibbonTheiaRibbonStrip) => {
      return strip.contentful_widgets;
    }).flat().filter(Boolean) as readonly Widget[]);
  }

  scrollStripIntoView(
    strip: CodeRibbonTheiaRibbonStrip,
    {
      skip_visible_check = false,
      scroll_behavior = 'smooth',
    }: {
      skip_visible_check?: boolean;
      scroll_behavior?: ScrollBehavior;
    }={}
  ): Promise<boolean> {
    const scrollFinish = new Promise<boolean>((resolve, reject) => {

      if (!skip_visible_check) {
        // TODO check if a strip is already on-screen
      }

      var timeoutHandle: number | undefined = undefined;
      let cur_scroll = this.scrollLeft;
      let scrollDiff = 0;

      let container_bounds = this.node.getBoundingClientRect();
      let strip_bounds = strip.node.getBoundingClientRect();

      if (strip_bounds.right > container_bounds.right) {
        scrollDiff = strip_bounds.right - container_bounds.right;
      }
      else if (strip_bounds.left < container_bounds.left) {
        scrollDiff = strip_bounds.left - container_bounds.left;
      }

      const target_scroll = cur_scroll + scrollDiff;
      const fixed_scroll = Number(target_scroll.toFixed());

      crdebug("Scrolling", scrollDiff, "to get", strip, "into view...");
      this.node.classList.add("cr-managed-scroll-active");

      const stopScrollCallback = () => {
        cur_scroll = this.scrollLeft;
        cur_scroll = Number(cur_scroll.toFixed());
        let did_achieve = true;
        if (cur_scroll != fixed_scroll && cur_scroll+1 != fixed_scroll) {
          did_achieve = false;
        }
        this.node.classList.remove("cr-managed-scroll-active");

        if (did_achieve) {
          resolve(did_achieve);
        }
        else {
          // TODO check if strip is on screen, if not, reject
          reject("failed to achieve target scroll");
        }
      };

      const checkScroll = () => {
        if (Number(this.scrollLeft.toFixed()) == fixed_scroll) {
          this.node.removeEventListener('scroll', checkScroll);
          stopScrollCallback();
        }
        else {
          window.clearTimeout(timeoutHandle);
          timeoutHandle = window.setTimeout(() => {
            this.node.removeEventListener('scroll', checkScroll);
            stopScrollCallback();
          }, 210); // ms timeout
        }
      };

      this.node.addEventListener('scroll', checkScroll);
      checkScroll();
      setTimeout(() => {
        this.node.scrollTo({
          left: target_scroll,
          behavior: scroll_behavior,
        });
      });

    });

    return scrollFinish;
  }

  saveLayout(): RibbonPanel.ILayoutConfig {
    crdebug("RibbonPanel saves layout");
    return (this.layout as CodeRibbonTheiaRibbonLayout).saveLayout();
  }

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  restoreLayout(config: RibbonPanel.ILayoutConfig): void {
    // TODO
    crdebug("RibbonPanel restores layout with config", config);

    // MessageLoop.postMessage(this, Private.LayoutModified);
  }

  // NOTE === phosphor DockPanel API compatility section === NOTE //
  // we might want to split this into a `ImprovedBoxPanel` class instead?
  // this section is because phosphor's BoxPanel has only a tiny fraction of the
  // features that DockPanel has, and they're expected by Theia

  // @ts-expect-error TS2425: Class defines instance member property 'widgets', but extended class defines it as instance member function.
  override widgets(): IIterator<Widget> {
    // TODO iterate widgets in order of ribbon layout from within strips
    // return (this.layout as CodeRibbonTheiaRibbonLayout).widgets;
    return iter(this.contentful_widgets);
  }

  tabBars(): IIterator<TabBar<Widget>> {
    // TODO removal of tabBars
    // return this._root ? this._root.iterTabBars() : empty<TabBar<Widget>>();
    return empty<TabBar<Widget>>();
  }

  // TODO signal connections from columns
  private _layoutModified = new Signal<this, void>(this);
  get layoutModified() {
    return this._layoutModified;
  }

  // overriding BoxPanel's p-BoxPanel-child
  override onChildAdded(msg: Widget.ChildMessage) {
    msg.child.addClass('p-RibbonPanel-child');
  }
  // NOTE redefined later
  // override onChildRemoved(msg) {
  //   msg.child.removeClass('p-RibbonPanel-child');
  // }

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
    msg.child.removeClass('p-RibbonPanel-child');
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
    const tabBars = toArray(this.tabBars());
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
    if (
      layout instanceof DockLayout || layout instanceof BoxLayout ||
      layout instanceof CodeRibbonTheiaRibbonLayout
    ) {
      crdebug("in toggleMaximized, layout is", layout);

      // NOTE temporary store
      // @ts-expect-error TS7053: Element implicitly has an 'any' type
      const onResize: any = layout['onResize'];
      // @ts-expect-error TS7053: Element implicitly has an 'any' type
      layout['onResize'] = () => onResize.bind(layout)(Widget.ResizeMessage.UnknownSize);
      // @ts-expect-error TS7053: Element implicitly has an 'any' type
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

}

namespace Private {
  export
  function createLayout(options: RibbonPanel.IOptions): CodeRibbonTheiaRibbonLayout {
    return options.layout || new CodeRibbonTheiaRibbonLayout(options);
  }
}
