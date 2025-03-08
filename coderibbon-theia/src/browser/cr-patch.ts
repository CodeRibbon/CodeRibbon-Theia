// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

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
} from "@phosphor/widgets";
import {
  Drag, IDragEvent
} from '@phosphor/dragdrop';
import {
  MimeData
} from '@phosphor/coreutils';
import {
  ElementExt
} from '@phosphor/domutils';
import {
  IDisposable
} from '@phosphor/disposable';

import { crdebug } from "./cr-logger";


export class CodeRibbonTheiaPatch extends TabPanel {
  private _renderer?: DockLayout.IRenderer;
  readonly tabBar: TabBar<Widget>;

  constructor(options: CodeRibbonTheiaPatch.IOptions = {}) {
    super();
    this.addClass("cr-RibbonPatch");
    crdebug("Patch constructor", this);

    this._renderer = options.renderer;

    if (!this._renderer) {
      crdebug("WARN: Patch: I didn't get the renderer!", this._renderer);
      throw "expected to have the renderer!";
    };

    // crdebug("makin that new tabBar!", this);
    this.tabBar.dispose();
    let old_tabBar = this.tabBar;

    // should be using Theia's createTabBar from application-shell
    this.tabBar = this._renderer.createTabBar();
    this.tabBar.addClass('p-TabPanel-tabBar');
    // @ts-expect-error TS2341: Property '_onTabMoved' is private
    this.tabBar.tabMoved.connect(this._onTabMoved, this);
    // @ts-expect-error TS2341: Property is private
    this.tabBar.currentChanged.connect(this._onCurrentChanged, this);
    // @ts-expect-error TS2341: Property is private
    this.tabBar.tabCloseRequested.connect(this._onTabCloseRequested, this);
    // @ts-expect-error TS2341: Property is private
    this.tabBar.tabActivateRequested.connect(this._onTabActivateRequested, this);

    this.tabBar.orientation = old_tabBar.orientation;
    BoxLayout.setStretch(this.tabBar, 0);
    BoxLayout.setStretch(this.stackedPanel, 1);

    (this.layout as BoxLayout).insertWidget(0, this.tabBar);
    // this.layout.addWidget(this.stackedPanel);

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
  }

  override activate(): void {
    super.activate();
    crdebug("Patch activate", this);
    if (this.contentful_widget) this.contentful_widget.activate();
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
    renderer?: DockLayout.IRenderer;
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
