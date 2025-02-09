import {
  injectable,
  inject,
  postConstruct,
} from "@theia/core/shared/inversify";

import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  DockLayout,
  BoxLayout,
  FocusTracker,
} from "@phosphor/widgets";
import { MessageService } from "@theia/core/lib/common";
import { FrontendApplicationStateService } from "@theia/core/lib/browser/frontend-application-state";
// import {
//   FrontendApplication, FrontendApplicationContribution,
// } from '@theia/core/lib/browser/frontend-application';
import { CorePreferences } from "@theia/core/lib/browser/core-preferences";
import {
  TheiaDockPanel,
  BOTTOM_AREA_ID,
  MAIN_AREA_ID,
  MAXIMIZED_CLASS,
} from "@theia/core/lib/browser/shell/theia-dock-panel";
import {
  DockPanelRenderer,
  DockPanelRendererFactory,
  ApplicationShell,
} from "@theia/core/lib/browser/shell/application-shell";
import { SidePanel } from "@theia/core/lib/browser/shell/side-panel-handler";

import { CodeRibbonTheiaRibbonPanel } from "./cr-ribbon";

import { crdebug } from "./cr-logger";

// https://github.com/eclipse-theia/theia/blob/f0cdf69e65cd048dfeb06c45ff4189a6d5cf14a6/packages/core/src/browser/shell/application-shell.ts#L42
/** The class name added to ApplicationShell instances. */
const APPLICATION_SHELL_CLASS = "theia-ApplicationShell";
/** The class name added to the main and bottom area panels. */
const MAIN_BOTTOM_AREA_CLASS = "theia-app-centers";
/** Status bar entry identifier for the bottom panel toggle button. */
const BOTTOM_PANEL_TOGGLE_ID = "bottom-panel-toggle";
/** The class name added to the main area panel. */
const MAIN_AREA_CLASS = "theia-app-main";
/** The class name added to the bottom area panel. */
const BOTTOM_AREA_CLASS = "theia-app-bottom";

@injectable()
export class CodeRibbonApplicationShell extends ApplicationShell {
  // @ts-expect-error TS2416: Property in type is not assignable to the same property in base type
  override mainPanel: CodeRibbonTheiaRibbonPanel;

  /**
   * Create the dock panel in the main shell area.
   *
   * Override the default from using TheiaDockPanel to CodeRibbonTheiaRibbonPanel
   */
  // @ts-expect-error TS2416: Property in type is not assignable to the same property in base type
  override createMainPanel(): CodeRibbonTheiaRibbonPanel {
    crdebug("CRAS: overridden createMainPanel start");
    const renderer = this.dockPanelRendererFactory();

    renderer.tabBarClasses.push(MAIN_BOTTOM_AREA_CLASS);
    renderer.tabBarClasses.push(MAIN_AREA_CLASS);

    /**
     * used in a get
     * https://github.com/eclipse-theia/theia/blob/05982e8cc568e845f5a08f75a8771328a957e01c/packages/plugin-ext/src/main/browser/tabs/tabs-main.ts#L76
     * 2025-02-04T11:04:41.808Z root ERROR Failed to load plugins: TypeError: Cannot read properties of undefined (reading 'onDidCreateTabBar')
     *
     * WARNING: I feel like this may be a point where plugin functionality breaks later on:
     * this might be where context menu additions on tabs are eaten away
     * because we've completely replaced the normal DockPanel
     *
     * DockPanel takes this `renderer` but BoxPanel does not
     */
    // @ts-ignore TS2341: _mainPanelRenderer is private
    this._mainPanelRenderer = renderer;

    // original, untouched
    // const dockPanel = new TheiaDockPanel({
    //   mode: 'multiple-document',
    //   renderer,
    //   spacing: 0
    // }, this.corePreferences);

    // what I want, based on BoxPanel
    const ribbonPanel = new CodeRibbonTheiaRibbonPanel({
      alignment: "start",
      direction: "left-to-right",
      spacing: 0,
      mode: 'multiple-document',
      renderer,
    });

    // working, only while CRTRP extends TheiaDockPanel
    // const ribbonPanel = new CodeRibbonTheiaRibbonPanel({
    //   mode: 'multiple-document',
    //   renderer,
    //   spacing: 0
    // }, this.corePreferences);

    ribbonPanel.id = MAIN_AREA_ID;
    ribbonPanel.widgetAdded.connect((_, widget) =>
      this.fireDidAddWidget(widget),
    );
    ribbonPanel.widgetRemoved.connect((_, widget) =>
      this.fireDidRemoveWidget(widget),
    );

    ribbonPanel.cr_init({
      // shell: this,
    });

    return ribbonPanel;
  }

  /**
   * overriding this in order to ensure that when the layout is restored,
   * all the restored widgets are tracked
   *
   * original: https://github.com/eclipse-theia/theia/blob/v1.29.0/packages/core/src/browser/shell/application-shell.ts#L769
   *
   * @param data  [description]
   */
  override registerWithFocusTracker(
    data: /*ADDED TYPE:*/
    | CodeRibbonTheiaRibbonPanel.IRibbonLayoutConfig
      | DockLayout.ITabAreaConfig
      | DockLayout.ISplitAreaConfig
      | SidePanel.LayoutData
      | null,
  ): void {
    crdebug("CRAS registerWithFocusTracker", data);
    if (data && data.type == "ribbon-area") {
      // shortcut to tracking all the widgets restored from the config:
      crdebug("CRAS registerWithFocusTracker tracking restored widgets...");
      for (const strip of data.strip_configs) {
        for (const patch of strip.patch_configs) {
          if (patch.widget) {
            this.track(patch.widget);
          }
        }
      }
    } else {
      super.registerWithFocusTracker(data);
    }
  }
}
