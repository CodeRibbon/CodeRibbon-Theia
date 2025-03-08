import {
  injectable,
  inject,
  postConstruct,
} from "@theia/core/shared/inversify";

import { Signal } from "@phosphor/signaling";
import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  DockLayout,
  BoxLayout,
  BoxSizer,
  FocusTracker,
} from "@phosphor/widgets";
// import {
//   empty, IIterator,
// } from '@phosphor/algorithm';
import {
  MessageService,
  Emitter,
  environment,
  Disposable,
  DisposableCollection,
} from "@theia/core/lib/common";
// import {
//   TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID, MAXIMIZED_CLASS,
// } from '@theia/core/lib/browser/shell/theia-dock-panel';
import { FrontendApplicationStateService } from "@theia/core/lib/browser/frontend-application-state";
import { CorePreferences } from "@theia/core/lib/browser/core-preferences";

import { crdebug } from "./cr-logger";
import { CodeRibbonTheiaPatch } from "./cr-patch";
import { RibbonPanel, RibbonStrip } from './cr-interfaces';
import { ImprovedBoxPanel } from "./improvedboxpanel";
import { ImprovedBoxLayout } from "./improvedboxlayout";

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

  // Emitted when a patch is added to this strip
  readonly patchAdded = new Signal<this, CodeRibbonTheiaPatch>(this);

  protected readonly tracker = new FocusTracker<CodeRibbonTheiaPatch>();
  // readonly patchAdded = new Signal<this, CodeRibbonTheiaPatch>(this);

  // protected readonly onDidToggleMaximizedEmitter = new Emitter<Widget>();
  // readonly onDidToggleMaximized = this.onDidToggleMaximizedEmitter.event;

  constructor(
    options?: CodeRibbonTheiaRibbonStrip.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    super({
      alignment: "start",
      direction: "top-to-bottom",
      renderer: options?.renderer,
    });
    this.addClass("cr-RibbonStrip");
    crdebug("RibbonStrip constructor:", this, options);
  }

  cr_init(options?: CodeRibbonTheiaRibbonStrip.IInitOptions) {
    crdebug("RibbonStrip cr_init", this, options);

    if (options?.config) {
      crdebug("RibbonStrip cr_init: restoring strip layout...");
      this.restoreLayout(options.config);
    } else {
      // TODO vpps
      // while (this.widgets.length < this.vpps) {
      for (let i = 0; i < 2; ++i) {
        crdebug("adding patch to meet vpps ...");
        let new_patch = this.createPatch();
      }
    }

    let update_current_patch = () => {
      this._patches.map((patch) => {
        patch.node.classList.remove("cr-current");
      });
      if (this.mru_patch) this.mru_patch.node.classList.add("cr-current");
    };
    update_current_patch();
    this.tracker.currentChanged.connect(update_current_patch);
  }

  override dispose(): void {
    this.tracker.dispose();
    super.dispose();
  }

  get vpps(): number {
    return 2; // TODO
  }

  get _patches(): readonly CodeRibbonTheiaPatch[] {
    // TODO filter to Patches?
    // TODO error below avoidable?
    // ts-expect-error TS2322: Type 'readonly Widget[]' is not assignable to type 'Iterable<CodeRibbonTheiaPatch>'.
    return (this.layout as ImprovedBoxLayout)
      .widgets as readonly CodeRibbonTheiaPatch[];
  }

  // TODO options
  createPatch(args: CodeRibbonTheiaRibbonStrip.ICreatePatchArgs = {}) {
    let { index, options, init_options } = args;
    let new_patch = new CodeRibbonTheiaPatch({
      ...options,
      renderer: (this._renderer as DockPanel.IRenderer),
    });
    super.addWidget(new_patch);
    if (args.index != undefined) {
      this.insertWidget(args.index, new_patch);
    }
    new_patch.cr_init(init_options);
    this.tracker.add(new_patch);

    this.patchAdded.emit(new_patch);
    return new_patch;
  }

  override addWidget(
    widget: Widget,
    options?: RibbonStrip.IAddOptions,
  ): void {
    // super.addWidget(widget);
    crdebug("Strip addWidget", widget, options);

    // defaults first
    let target_patch = this._patches.find((patch) => {
      return patch.contentful_size == 0;
    });
    let split_from: CodeRibbonTheiaPatch = this.mru_patch || this._patches[0] || this.createPatch();
    switch (options?.mode) {
      // case "split-top":
      //   if (this._patches[0].contentful_size) {
      //     target_patch = this.createPatch({
      //       index: 0,
      //     });
      //   } // else use first patch, it is empty
      //   break;
      // case "split-bottom":
      //   if (this._patches.at(-1)?.contentful_size) {
      //     // new one at bottom
      //     target_patch = this.createPatch();
      //   }
      //   else {
      //     target_patch = this._patches.at(-1);
      //   }
      //   break;
      // NOTE *apparently* Theia has the SPLIT_DOWN command mapped to -bottom ...
      // https://github.com/eclipse-theia/theia/blob/8b3ea1cbfbfd93e621fc1bff14d24d400656748a/packages/editor/src/browser/editor-contribution.ts#L162-L163
      case "split-top":
      case "split-up":
        if (options.ref) split_from = this.whichPatchHasWidget(options.ref) || split_from;
        target_patch = split_from.contentful_size ? this.createPatch({
          index: this._patches.indexOf(split_from),
        }) : split_from;
        break;
      case "split-bottom":
      case "split-down":
        if (options.ref) split_from = this.whichPatchHasWidget(options.ref) || split_from;
        target_patch = split_from.contentful_size ? this.createPatch({
          index: this._patches.indexOf(split_from) + 1,
        }) : split_from;
        break;
      case "replace-current":
        if (options.ref) {
          target_patch = this.whichPatchHasWidget(options.ref) || target_patch;
        } else {
          target_patch = this.mru_patch || target_patch;
        }
        break;
      default:
        // no mode yet given a ref? put it there if possible
        if (options?.ref) {
          let other = this.whichPatchHasWidget(options.ref);
          if (other && other.contentful_size == 0) {
            target_patch = other;
          }
        }
        break;
    }

    if (!target_patch) {
      target_patch = this.createPatch();
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
    return this._patches
      .map((patch) => {
        return patch.contentful_widget;
      })
      .filter(Boolean) as Widget[];
  }

  get mru_patch(): CodeRibbonTheiaPatch | null {
    return this.tracker.currentWidget;
  }

  get_sibling(ref: CodeRibbonTheiaPatch, side: string) {
    const ref_idx = this._patches.indexOf(ref);
    if (ref_idx == -1) {
      crdebug("get_sibling: ref passed not in patches?", ref);
      return undefined;
    }

    switch (side) {
      case "before":
      case "above":
        if (ref_idx <= 0) {
          return undefined;
        }
        return this._patches[ref_idx - 1];
      case "after":
      case "below":
        if (ref_idx + 1 >= this._patches.length) {
          return undefined;
        }
        return this._patches[ref_idx + 1];
      default:
        throw new Error("get_sibling invalid side:" + side);
    }
  }

  whichPatchHasWidget(widget: Widget): CodeRibbonTheiaPatch | null {
    if (!this.contains(widget)) return null;

    while (!(widget instanceof CodeRibbonTheiaPatch)) {
      if (widget.parent == null) return null;
      widget = widget.parent;
    }
    return widget;
  }

  has_empty_patch() {
    if (this.contentful_size < this._patches.length) {
      return true;
    } else {
      return false;
    }
  }

  // get ribbonOffsetLeft(): number {
  //   let rect = this.node?.getBoundingClientRect();
  //   let parent_rect = this.node?.offsetParent.getBoundingClientRect();
  // }

  // overriding BoxPanel's p-BoxPanel-child
  protected override onChildAdded(msg: Widget.ChildMessage) {
    super.onChildAdded(msg);
    msg.child.addClass("cr-RibbonStrip-child");
    this.widgetAdded.emit(msg.child);
  }

  protected override onChildRemoved(msg: Widget.ChildMessage): void {
    super.onChildRemoved(msg);
    msg.child.removeClass("cr-RibbonStrip-child");
    this.widgetRemoved.emit(msg.child);

    if (this._patches.length === 0) {
      // goodbye world! I no longer have a purpose!
      // - an empty ribbon strip
      this.dispose();
    }
  }

  // NOTE === phosphor DockPanel API compatibility section === NOTE //
  // we might want to split this into a `ImprovedBoxPanel` class instead?
  // this section is because phosphor's BoxPanel has only a tiny fraction of the
  // features that DockPanel has, and they're expected by Theia

  // NOTE: don't pass to ImprovedBoxPanel cause we need empty patch data
  saveLayout(): CodeRibbonTheiaRibbonStrip.ILayoutConfig {
    crdebug("RibbonStrip saveLayout");
    return {
      orientation: "vertical", // always
      sizes: (this.layout as ImprovedBoxLayout)?.getNormalizedSizes(),
      patch_configs: this._patches.map((patch) => patch.saveLayout()),
      last_active_patch: 0, // TODO
    };
  }

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  // NOTE: don't pass to ImprovedBoxPanel cause ... (above)
  restoreLayout(config: CodeRibbonTheiaRibbonStrip.ILayoutConfig): void {
    crdebug("RibbonStrip restoreLayout:", config);

    if (config.patch_configs) {
      // TODO any checks before we wipe all the patches?
      this._patches.map((patch) => patch.dispose());
      config.patch_configs.map((patch_config) => {
        // TODO this could be passed in options to reduce calls
        let new_patch = this.createPatch({
          init_options: {
            config: patch_config,
          },
        });
      });

      // TODO sizers
      if (config.sizes) {
        crdebug("restoring RibbonStrip sizers...", config.sizes);
        (this.layout as ImprovedBoxLayout).restoreNormalizedSizes(config.sizes);
        // setTimeout(() => {
        // });
        // try {
        // } catch {
        //   crdebug("ERROR: failed to restoreNormalizedSizes, ignoring");
        // }
      }

      // TODO last_active_patch

      this.update();
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
      this.toDisposeOnMarkAsCurrent.push(
        Disposable.create(() => title.owner.disposed.disconnect(resetCurrent)),
      );
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
    renderer?: DockLayout.IRenderer;
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
    sizes: number[]; // normalized sizes (sum to 1.0)
    patch_configs: CodeRibbonTheiaPatch.ILayoutConfig[];
    last_active_patch?: number; // TODO
    orientation: "vertical"; // ignored, BoxLayout compatibility
    widgets?: any; // ignored, BoxLayout compatibility
  }
}
