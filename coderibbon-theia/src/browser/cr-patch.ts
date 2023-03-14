
// import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel, Panel, StackedPanel, TabPanel,
  DockLayout, BoxLayout,
  BoxEngine, BoxSizer,
} from '@phosphor/widgets';

import { crdebug } from './cr-logger';

export class CodeRibbonTheiaPatch extends TabPanel {

  constructor(options: CodeRibbonTheiaPatch.IOptions = {}) {
    super();
    this.addClass('cr-RibbonPatch');
    crdebug("Patch constructor", this);
  }

  cr_init(options: CodeRibbonTheiaPatch.IInitOptions = {}) {
    crdebug("Patch cr_init", this);

    if (options?.config) {
      this.restoreLayout(options.config);
    }
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
    }
    else {
      return undefined;
    }
  }

  saveLayout(): CodeRibbonTheiaPatch.ILayoutConfig {
    crdebug("Patch saveLayout");
    return {
      mode: this.contentful_size ? 'widget' : 'empty',
      widget: this.contentful_widget,
    }
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
    // TODO
  }

  export interface IInitOptions {
    config?: CodeRibbonTheiaPatch.ILayoutConfig;
  }

  export interface ILayoutConfig {
    // Atom CR equivalent: fuzzyfinder, cr-tips, pane
    mode: 'fuzzyfinder' | 'empty' | 'widget';
    widget?: Widget; // mode-dependent
  }
}
