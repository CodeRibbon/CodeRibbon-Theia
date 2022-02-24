import { injectable, inject } from '@theia/core/shared/inversify';

import {
  MessageService,
} from '@theia/core/lib/common';
import {
  AbstractViewContribution,
  FrontendApplicationContribution,
} from '@theia/core/lib/browser';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  ApplicationShell,
} from '@theia/core/lib/browser/shell/application-shell';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';

import {crdebug} from './CodeRibbon-logger';

// import { CodeRibbonTheiaRibbonViewContribution } from './CodeRibbon-Theia-ribbon';

@injectable()
export class CodeRibbonTheiaManager implements FrontendApplicationContribution {

  constructor(
    @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService,
    @inject(MessageService) private readonly messageService: MessageService,
    // @inject(ApplicationShell) protected readonly _shell: ApplicationShell,
  ) {}

  registerCommands(registry: CommandRegistry): void {
    // registry.registerCommand(CodeRibbonHelloWorldCommand, {
    //   execute: () => this.messageService.info("CodeRibbon says hello!")
    // });
    crdebug("manager registerCommands: registry:", registry);
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
    return;
  }

  /**
   * invoked every launch
   */
  async configure(app: FrontendApplication): Promise<void> {
    crdebug("ribbon configure: app:", app);
    return;
  }

}
