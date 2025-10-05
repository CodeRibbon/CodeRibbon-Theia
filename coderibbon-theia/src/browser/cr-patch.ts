/** @format */

import { interfaces as InversifyInterfaces } from "@theia/core/shared/inversify";
import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  Panel,
  StackedPanel,
  TabPanel,
  DockLayout,
  BoxLayout,
  BoxEngine,
  BoxSizer,
} from "@lumino/widgets";
import { Drag } from "@lumino/dragdrop";
import { MimeData } from "@lumino/coreutils";
import { ElementExt } from "@lumino/domutils";
import { IDisposable } from "@lumino/disposable";
import { MessageLoop } from "@lumino/messaging";
import { WidgetManager } from "@theia/core/lib/browser";

import { crdebug } from "./cr-logger";
import { CodeRibbonFuzzyFileOpenerWidget } from "./cr-fuzzy-file-opener";
import { option } from "yargs";

export class CodeRibbonTheiaPatch extends TabPanel {
  private _renderer: DockLayout.IRenderer;
  readonly tabBar: TabBar<Widget>;
  private _tabBarMutationObserver?: MutationObserver;
  private _container: InversifyInterfaces.Container;

  constructor(options: CodeRibbonTheiaPatch.IOptions) {
    super();
    this.addClass("cr-RibbonPatch");
    crdebug("Patch constructor", this);

    this._renderer = options.renderer;
    this._container = options.container;

    // crdebug("makin that new tabBar!", this);
    this.tabBar.dispose();
    let old_tabBar = this.tabBar;

    // should be using Theia's createTabBar from application-shell
    this.tabBar = this._renderer.createTabBar();
    this.tabBar.addClass("p-TabPanel-tabBar");
    this.tabBar.tabMoved.connect(
      // @ts-expect-error TS2341: Property is private
      this._onTabMoved,
      this,
    );
    this.tabBar.currentChanged.connect(
      // @ts-expect-error TS2341: Property is private
      this._onCurrentChanged,
      this,
    );
    this.tabBar.tabCloseRequested.connect(
      // @ts-expect-error TS2341: Property is private
      this._onTabCloseRequested,
      this,
    );
    this.tabBar.tabActivateRequested.connect(
      // @ts-expect-error TS2341: Property is private
      this._onTabActivateRequested,
      this,
    );

    this.tabBar.orientation = old_tabBar.orientation;
    BoxLayout.setStretch(this.tabBar, 0);
    BoxLayout.setStretch(this.stackedPanel, 1);

    (this.layout as BoxLayout).insertWidget(0, this.tabBar);
    // this.layout.addWidget(this.stackedPanel);

    this._tabBarMutationObserver = new MutationObserver(
      () => this.onTabBarMutated,
    );
    this._tabBarMutationObserver.observe(this.tabBar.node, {
      childList: true,
      subtree: true,
    });

    // crdebug("patch constructor done, made this", this, this.tabBar);
  }

  cr_init(options: CodeRibbonTheiaPatch.IInitOptions = {}) {
    crdebug("Patch cr_init", this);

    if (options?.config) {
      this.restoreLayout(options.config);
    }

    // enable the TabBar to support dragging the tab out of the bar:
    this.tabBar.tabsMovable = true;
    this.tabBar.allowDeselect = false;

    // HACK to do this after other updates have been applied
    setTimeout(() => this.refitBoxLayout(), 2);
    // this.refitBoxLayout();
  }

  /**
   * TODO find the best place for this:
   * I am not sure at which stage or event Theia creates the breadcrumbs, but this should be triggered by that action
   *
   * we need to initiate another fit since theia adds breadcrumbs to the TabBar that TabPanel (using BoxLayout) doesn't account for in the constructor
   * this should be run upon any event which could cause the size of the TabBar to change,
   * I believe it's idempotent, but it would be an expensive operation to perform on every resize or across all patches
   *
   * we do it as a message instead of calling ._fit directly as it's private and could be overriden or caught in some other place
   */
  refitBoxLayout(): void {
    MessageLoop.sendMessage(this, Widget.Msg.FitRequest);
  }

  override dispose(): void {
    super.dispose();
    if (this._tabBarMutationObserver) {
      this._tabBarMutationObserver.disconnect();
    }
  }

  onTabBarMutated(mutationList: MutationRecord[], observer: MutationObserver) {
    crdebug("patch: onTabBarMutated:", this, mutationList, observer);
    /**
     * we only care for direct descendants of the TabBar, because the breadcrumbs are added like:
     * .lm-TabBar > .theia-tabBar-breadcrumb-row
     */
    mutationList.forEach((mut) => {
      crdebug("patch: FitRequest because the TabBar nodes were changed", this);
      this.refitBoxLayout();
    });
  }

  override activate(): void {
    super.activate();
    crdebug("Patch activate", this);
    if (this.contentful_widget) {
      this.contentful_widget.activate();
    } else {
      // if we have no content, we should display something that can hold focus
      // if (!this._cr_ffo_widget) {
      //   // make a new CRFFO to use
      //   this._cr_ffo_widget = ;
      // }
      // this.addWidget(this._cr_ffo_widget);
      // if (!this.widgetManager) {
      //   console.warn("CR: patch: no widgetmanager got injected!");
      // } else {
      //   // this.widgetManager.getOrCreateWidget(CodeRibbonFuzzyFileOpenerWidget.ID).then((w) => {
      //   //   this.addWidget(w);
      //   // });
      // }
      // TODO getOrCreateWidget for the CRFFO instance from the ribbon
      this.widgetManager
        .getOrCreateWidget<CodeRibbonFuzzyFileOpenerWidget>(
          CodeRibbonFuzzyFileOpenerWidget.ID,
        )
        .then((w) => {
          this.addWidget(w);
          w.activate();
        })
        .catch((reason) => {
          console.error(
            "CR: failed to add a CRFFO to this patch!",
            this,
            reason,
          );
        });
    }

    // TODO find a better place to trigger this
    // HACK until I find a working solution to trigger it elsewhere
    // (this._tabBarMutationObserver does not seem to be working and the one in cr_init is too early?)
    this.refitBoxLayout();
  }

  get contentful_size(): number {
    return this.widgets.length;
  }

  get contentful_widget(): Widget | undefined {
    if (this.widgets.length) {
      return this.widgets[0];
    } else {
      return undefined;
    }
  }

  get widgetManager(): WidgetManager {
    return this._container.get<WidgetManager>(WidgetManager);
  }

  saveLayout(): CodeRibbonTheiaPatch.ILayoutConfig {
    crdebug("Patch saveLayout");
    return {
      mode: this.contentful_size ? "widget" : "empty",
      widget: this.contentful_widget,
    };
  }

  restoreLayout(config: CodeRibbonTheiaPatch.ILayoutConfig): void {
    crdebug("Patch restoreLayout:", config);

    if (config.widget) {
      if (this.contentful_widget) {
        this.contentful_widget.dispose();
      }
      this.addWidget(config.widget);
    }
  }
}

export namespace CodeRibbonTheiaPatch {
  export interface IOptions {
    renderer: DockLayout.IRenderer;
    container: InversifyInterfaces.Container;
  }

  export interface IInitOptions {
    config?: CodeRibbonTheiaPatch.ILayoutConfig;
  }

  export interface ILayoutConfig {
    // Atom CR equivalent: fuzzyfinder, cr-tips, pane
    mode: "fuzzyfinder" | "empty" | "widget";
    widget?: Widget; // mode-dependent
  }
}

// namespace Private {}
