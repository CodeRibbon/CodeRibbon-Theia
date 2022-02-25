import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
} from '@phosphor/widgets';
import {
  MessageService,
} from '@theia/core/lib/common';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  FrontendApplication, FrontendApplicationContribution,
} from '@theia/core/lib/browser/frontend-application';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';
import {
  TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID
} from '@theia/core/lib/browser/shell/theia-dock-panel';
import {
  DockPanelRenderer, DockPanelRendererFactory, ApplicationShell,
} from '@theia/core/lib/browser/shell/application-shell';

import { CodeRibbonTheiaRibbonPanel } from './cr-ribbon';

import {crdebug} from './CodeRibbon-logger';


// @injectable()
// export class CodeRibbonApplicationShell extends ApplicationShell {
//
//   // mainPanel: CodeRibbonTheiaRibbonPanel;
//
//   /**
//    * Create the dock panel in the main shell area.
//    *
//    * Override the default from using TheiaDockPanel to CodeRibbonTheiaRibbonPanel
//    */
//   protected createMainPanel(): CodeRibbonTheiaRibbonPanel {
//     const renderer = this.dockPanelRendererFactory();
//
//     renderer.tabBarClasses.push(MAIN_BOTTOM_AREA_CLASS);
//     renderer.tabBarClasses.push(MAIN_AREA_CLASS);
//
//     // const dockPanel = new TheiaDockPanel({
//     //   mode: 'multiple-document',
//     //   renderer,
//     //   spacing: 0
//     // }, this.corePreferences);
//
//     const ribbonPanel = new CodeRibbonTheiaRibbonPanel({
//       alignment: 'start',
//       direction: 'left-to-right',
//       spacing: 0,
//     }, this.corePreferences);
//
//     ribbonPanel.id = MAIN_AREA_ID;
//     ribbonPanel.widgetAdded.connect((_, widget) => this.fireDidAddWidget(widget));
//     ribbonPanel.widgetRemoved.connect((_, widget) => this.fireDidRemoveWidget(widget));
//
//     return ribbonPanel;
//   }
//
// }
