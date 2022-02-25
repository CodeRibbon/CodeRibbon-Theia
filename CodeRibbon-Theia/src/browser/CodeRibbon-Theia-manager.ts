import { injectable, inject } from '@theia/core/shared/inversify';

import {
  MessageService,
} from '@theia/core/lib/common';
import {
  AbstractViewContribution,
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

// import { CodeRibbonTheiaRibbonViewContribution } from './CodeRibbon-Theia-ribbon';

@injectable()
export class CodeRibbonTheiaManager implements FrontendApplicationContribution {

  protected frontendApplication: FrontendApplication;

  constructor(
    @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService,
    @inject(MessageService) private readonly messageService: MessageService,
    @inject(ApplicationShell) protected readonly _original_shell: ApplicationShell,
    // @inject(CodeRibbonApplicationShell) protected readonly _cr_shell: CodeRibbonApplicationShell,
  ) {
    // @ts-ignore
    window.cr_manager = this;
  }

  // registerCommands(registry: CommandRegistry): void {
  //   // registry.registerCommand(CodeRibbonHelloWorldCommand, {
  //   //   execute: () => this.messageService.info("CodeRibbon says hello!")
  //   // });
  //   crdebug("manager registerCommands: registry:", registry);
  // }

  initialize(): void {
    crdebug("manager initialize");
  }

  /**
   * method is only called if there is no previously stored workbench layout
   *
   * e.g. a brand new workspace is opened
   */
  async initializeLayout(app: FrontendApplication): Promise<void> {
    crdebug("manager initializeLayout: app:", app);
    return;
  }

  /**
   * invoked every launch
   */
  async onStart(app: FrontendApplication): Promise<void> {
    crdebug("ribbon onStart: app:", app);
    // this.frontendApplication = app;
    // this.old_mainPanel = this._original_shell.mainPanel;
    // this._original_shell.mainPanel = this._cr_shell.mainPanel;
    return;
  }

  /**
   * invoked every launch, this is called before onStart, but after `initialize`
   */
  async configure(app: FrontendApplication): Promise<void> {
    crdebug("ribbon configure: app:", app);

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
