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
  TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID, MAXIMIZED_CLASS,
} from '@theia/core/lib/browser/shell/theia-dock-panel';
import {
  DockPanelRenderer, DockPanelRendererFactory, ApplicationShell,
} from '@theia/core/lib/browser/shell/application-shell';

import { CodeRibbonTheiaRibbonPanel } from './cr-ribbon';

import {crdebug} from './CodeRibbon-logger';

// https://github.com/eclipse-theia/theia/blob/f0cdf69e65cd048dfeb06c45ff4189a6d5cf14a6/packages/core/src/browser/shell/application-shell.ts#L42
/** The class name added to ApplicationShell instances. */
const APPLICATION_SHELL_CLASS = 'theia-ApplicationShell';
/** The class name added to the main and bottom area panels. */
const MAIN_BOTTOM_AREA_CLASS = 'theia-app-centers';
/** Status bar entry identifier for the bottom panel toggle button. */
const BOTTOM_PANEL_TOGGLE_ID = 'bottom-panel-toggle';
/** The class name added to the main area panel. */
const MAIN_AREA_CLASS = 'theia-app-main';
/** The class name added to the bottom area panel. */
const BOTTOM_AREA_CLASS = 'theia-app-bottom';


@injectable()
export class CodeRibbonApplicationShell extends ApplicationShell {

  override mainPanel: CodeRibbonTheiaRibbonPanel;

  /**
   * Create the dock panel in the main shell area.
   *
   * Override the default from using TheiaDockPanel to CodeRibbonTheiaRibbonPanel
   */
  override createMainPanel(): CodeRibbonTheiaRibbonPanel {
    crdebug("CRAS: overridden createMainPanel start");
    const renderer = this.dockPanelRendererFactory();

    renderer.tabBarClasses.push(MAIN_BOTTOM_AREA_CLASS);
    renderer.tabBarClasses.push(MAIN_AREA_CLASS);

    // original, untouched
    // const dockPanel = new TheiaDockPanel({
    //   mode: 'multiple-document',
    //   renderer,
    //   spacing: 0
    // }, this.corePreferences);

    // TODO what I want, based on BoxPanel
    // const ribbonPanel = new CodeRibbonTheiaRibbonPanel({
    //   alignment: 'start',
    //   direction: 'left-to-right',
    //   spacing: 0,
    // });

    // working, only while CRTRP extends TheiaDockPanel
    const ribbonPanel = new CodeRibbonTheiaRibbonPanel({
      mode: 'multiple-document',
      renderer,
      spacing: 0
    }, this.corePreferences);

    ribbonPanel.id = MAIN_AREA_ID;
    ribbonPanel.widgetAdded.connect((_, widget) => this.fireDidAddWidget(widget));
    ribbonPanel.widgetRemoved.connect((_, widget) => this.fireDidRemoveWidget(widget));

    return ribbonPanel;
  }

}
