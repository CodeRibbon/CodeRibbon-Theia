import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
  BoxSizer,
} from '@phosphor/widgets';
import {
  empty, IIterator,
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
import { CodeRibbonTheiaPatch } from './cr-patch';
import { RibbonPanel, RibbonStrip } from './cr-interfaces';
import { ImprovedBoxPanel } from './improvedboxpanel';
import { ImprovedBoxLayout } from './improvedboxlayout';


// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
@injectable()
export class CodeRibbonTheiaRibbonStrip extends ImprovedBoxPanel {

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

  constructor(options?: CodeRibbonTheiaRibbonStrip.IOptions,
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

  cr_init(options?: CodeRibbonTheiaRibbonStrip.IInitOptions) {
    crdebug("RibbonStrip cr_init", this, options);

    if (options?.config) {
      crdebug("RibbonStrip cr_init: restoring strip layout...");
      this.restoreLayout(options.config);
    }
    else {
      // TODO vpps
      // while (this.widgets.length < this.vpps) {
      for (let i = 0; i < 2; ++i) {
        crdebug("adding patch to meet vpps ...");
        let new_patch = this.createPatch();
      }
    }

  }

  get vpps(): number {
    return 2; // TODO
  }

  protected get _patches(): readonly CodeRibbonTheiaPatch[] {
    // TODO filter to Patches?
    // TODO error below avoidable?
    // ts-expect-error TS2322: Type 'readonly Widget[]' is not assignable to type 'Iterable<CodeRibbonTheiaPatch>'.
    return ((this.layout as ImprovedBoxLayout).widgets as readonly CodeRibbonTheiaPatch[]);
  }

  // TODO options
  createPatch(args: CodeRibbonTheiaRibbonStrip.ICreatePatchArgs = {}) {
    let {index, options, init_options} = args;
    let new_patch = new CodeRibbonTheiaPatch(options);
    super.addWidget(new_patch);
    new_patch.cr_init(init_options);
    return new_patch;
  }

  addWidget(widget: Widget, options?: CodeRibbonTheiaRibbonStrip.ICreatePatchArgs): void {
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
    this._patches.forEach((patch: CodeRibbonTheiaPatch) => {
      contentful_patches += patch.contentful_size;
    });

    return contentful_patches;
  }

  get contentful_widgets(): readonly Widget[] {
    return (this._patches.map(patch => {
      return patch.contentful_widget;
    }).filter(Boolean) as Widget[]);
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

  // overriding BoxPanel's p-BoxPanel-child
  protected onChildAdded(msg: Widget.ChildMessage) {
    super.onChildAdded(msg);
    msg.child.addClass('p-RibbonStrip-child');
    this.widgetAdded.emit(msg.child);
  }

  protected onChildRemoved(msg: Widget.ChildMessage): void {
    super.onChildRemoved(msg);
    msg.child.removeClass('p-RibbonStrip-child');
    this.widgetRemoved.emit(msg.child);
  }

  // NOTE === phosphor DockPanel API compatibility section === NOTE //
  // we might want to split this into a `ImprovedBoxPanel` class instead?
  // this section is because phosphor's BoxPanel has only a tiny fraction of the
  // features that DockPanel has, and they're expected by Theia

  // NOTE: don't pass to ImprovedBoxPanel cause we need empty patch data
  // @ts-expect-error TS2416: Property 'saveLayout' in type 'CodeRibbonTheiaRibbonStrip' is not assignable to the same property in base type 'ImprovedBoxPanel'.
  override saveLayout(): CodeRibbonTheiaRibbonStrip.ILayoutConfig {
    crdebug("RibbonStrip saveLayout");
    return {
      orientation: 'vertical',
      // sizers: this.layout?._sizers,
      sizers: [], // TODO
      patch_configs: this._patches.map(patch => patch.saveLayout()),
      last_active_patch: 0, // TODO
    }
  }

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  // NOTE: don't pass to ImprovedBoxPanel cause ... (above)
  override restoreLayout(config: CodeRibbonTheiaRibbonStrip.ILayoutConfig): void {
    crdebug("RibbonStrip restoreLayout:", config);

    if (config.patch_configs) {
      // TODO any checks before we wipe all the patches?
      this._patches.map(patch => patch.dispose());
      config.patch_configs.map(patch_config => {
        // TODO this could be passed in options to reduce calls
        let new_patch = this.createPatch({
          init_options: {
            config: patch_config,
          }
        });
      });

      // TODO sizers

      // TODO last_active_patch
    }

  }

  // // @ts-expect-error TS2425: Class defines instance member property 'widgets', but extended class defines it as instance member function.
  // widgets(): readonly Widget[] {
  // // widgets(): IIterator<Widget> {
  //   // TODO iterate widgets in order of ribbon layout
  //   return (this.layout as BoxLayout).widgets;
  // }

  // TODO signal connections from columns
  readonly _layoutModified = new Signal<this, void>(this);
  get layoutModified() {
    return this._layoutModified;
  }

  // NOTE === theia DockPanel API compatibility section === NOTE //

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

}

export namespace CodeRibbonTheiaRibbonStrip {
  export interface IOptions {
    quota?: number;
  }

  export interface ICreatePatchArgs {
    index?: number;
    options?: CodeRibbonTheiaPatch.IOptions;
    init_options?: CodeRibbonTheiaPatch.IInitOptions;
  }

  export interface IInitOptions {
    config?: ILayoutConfig; // an optional layout to restore
    quota?: number; // how many patches to have on init
  }

  export interface ILayoutConfig {
    sizers: BoxSizer[];
    patch_configs: CodeRibbonTheiaPatch.ILayoutConfig[];
    last_active_patch?: number; // TODO
    orientation: 'vertical'; // ignored, BoxLayout compatibility
    widgets?: any; // ignored, BoxLayout compatibility
  }
}
