
import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel, Panel, StackedPanel, TabPanel,
  DockLayout, BoxLayout,
  BoxEngine, BoxSizer,
} from '@phosphor/widgets';

import { crdebug } from './CodeRibbon-logger';

export class CodeRibbonTheiaPatch extends TabPanel {

  init() {
    crdebug("Patch init", this);
  }

  get contentful_size(): int {
    return this.widgets.length;
  }

  get contentful_widget(): Widget {
    if (this.widgets.length) {
      return this.widgets[0];
    }
    else {
      return undefined;
    }
  }
}
