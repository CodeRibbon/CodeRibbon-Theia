import { injectable, inject } from '@theia/core/shared/inversify';

import {
  Command, CommandContribution, CommandRegistry,
  MessageService,
} from '@theia/core/lib/common';

export const CodeRibbonHelloWorldCommand = {
  id: 'CodeRibbon.HelloWorld',
  label: "Hello, CodeRibbon.",
}

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaCommandContribution implements CommandContribution {

  constructor(
    @inject(MessageService) private readonly messageService: MessageService,
  ) {}

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(CodeRibbonHelloWorldCommand, {
      execute: () => this.messageService.info("CodeRibbon says hello!")
    });
  }

}
