import { injectable, inject } from '@theia/core/shared/inversify';

import {
  Widget,
} from '@phosphor/widgets';
import {
  MessageService,
} from '@theia/core/lib/common';
import {
  AbstractViewContribution, ViewContributionOptions,
  FrontendApplicationContribution,
} from '@theia/core/lib/browser';
import {
  FrontendApplication,
} from '@theia/core/lib/browser/frontend-application';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  ApplicationShell,
} from '@theia/core/lib/browser/shell/application-shell';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';

// import { CodeRibbonApplicationShell } from './cr-application-shell';

import {crdebug} from './CodeRibbon-logger';

import { CodeRibbonTheiaRibbonPanel } from './cr-ribbon';

const CR_MAIN_AREA_ID = "cr-theia-ribbon";

@injectable()
export class CodeRibbonTheiaManager implements FrontendApplicationContribution {

  protected frontendApplication: FrontendApplication;
  protected ribbonPanel: CodeRibbonTheiaRibbonPanel;

  @inject(ApplicationShell)
  protected readonly _original_shell: ApplicationShell;
  @inject(MessageService) private readonly messageService: MessageService;
  @inject(FrontendApplicationStateService)
  protected readonly stateService: FrontendApplicationStateService;
  @inject(CorePreferences) protected readonly corePreferences: CorePreferences;

  constructor() {
    // super({
    //   widgetId: CodeRibbonTheiaRibbonPanel.ID,
    //   widgetName: "CodeRibbon Ribbon",
    //   defaultWidgetOptions: {
    //     alignment: 'start',
    //     direction: 'left-to-right',
    //     spacing: 5,
    //   },
    //   toggleCommandId: 'CodeRibbon.ManagerConstructorToggleCommand',
    // })
  }

  // registerCommands(registry: CommandRegistry): void {
  //   // registry.registerCommand(CodeRibbonHelloWorldCommand, {
  //   //   execute: () => this.messageService.info("CodeRibbon says hello!")
  //   // });
  //   crdebug("manager registerCommands: registry:", registry);
  // }

  initialize(): void {
    crdebug("manager initialize");
    // @ts-ignore
    window.cr_manager = this;

    // this.ribbonPanel = new CodeRibbonTheiaRibbonPanel({
    //   alignment: 'start',
    //   direction: 'left-to-right',
    //   spacing: 0,
    // });
    // // , this.corePreferences
    //
    // this.ribbonPanel.id = CR_MAIN_AREA_ID;
  }

  /**
   * method is only called if there is no previously stored workbench layout
   *
   * e.g. a brand new workspace is opened
   */
  async initializeLayout(app: FrontendApplication): Promise<void> {
    crdebug("manager initializeLayout");

    return;
  }

  /**
   * invoked every launch
   */
  async onStart(app: FrontendApplication): Promise<void> {
    crdebug("manager onStart");

    // this.stateService.reachedState('ready').then(
    //   () => {
    //     this.openView({reveal: true});
    //     // app.shell.mainPanel.mode = 'single-document';
    //     app.shell.mainPanel.setFlag(Widget.Flag.DisallowLayout);
    //   }
    // )

    return;
  }

  /**
   * invoked every launch, this is called before onStart, but after `initialize`
   */
  async configure(app: FrontendApplication): Promise<void> {
    crdebug("manager configure");

    return;
  }

  /**
   * fired on unload / when app exits
   */
  onStop(app: FrontendApplication): void {
    crdebug("manager onStop: goodbye!");
    return;
  }

}
