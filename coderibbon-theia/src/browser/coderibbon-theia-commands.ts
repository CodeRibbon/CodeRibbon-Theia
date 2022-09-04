import { injectable, inject } from '@theia/core/shared/inversify';

import {
  Command, CommandContribution, CommandRegistry,
  MessageService,
} from '@theia/core/lib/common';

import {crdebug} from './cr-logger';

export const CodeRibbonHelloWorldCommand = {
  id: 'CodeRibbon.HelloWorld',
  label: "Hello, CodeRibbon.",
}

export const CodeRibbonDevGetPanelCommand = {
  id: 'CodeRibbon.dev.getDockPanel',
  label: "dev: getDockPanel",
}

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaCommandContribution implements CommandContribution {

  constructor(
    @inject(MessageService) private readonly messageService: MessageService,
    // @inject(PreferenceService) protected readonly prefService: PreferenceService,
  ) {}

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(CodeRibbonHelloWorldCommand, {
      execute: () => {
        this.messageService.info("CodeRibbon says hello!");
        crdebug("Hello console! CommandContribution:", this);
      }
    });
    registry.registerCommand(CodeRibbonDevGetPanelCommand, {
      execute: () => {
        crdebug();
      }
    });
  }

}
