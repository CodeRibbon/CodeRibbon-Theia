
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel, Panel, StackedPanel, TabPanel,
  DockLayout, BoxLayout,
  BoxEngine, BoxSizer,
} from '@phosphor/widgets';

import { crdebug } from './coderibbon-logger';

export class CodeRibbonTheiaPatch extends TabPanel {

  constructor(options = {}) {
    super();
    this.addClass('p-RibbonPatch');
    crdebug("Patch constructor", this);
  }

  init() {
    crdebug("Patch init", this);
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
}
