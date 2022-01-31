import { injectable } from '@theia/core/shared/inversify';

import { CommonMenus } from '@theia/core/lib/browser';
import {
  MenuContribution, MenuModelRegistry, MessageService
} from '@theia/core/lib/common';

import { CodeRibbonHelloWorldCommand } from './CodeRibbon-Theia-commands';

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaMenuContribution implements MenuContribution {

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerMenuAction(CommonMenus.EDIT, {
      commandId: CodeRibbonHelloWorldCommand.id,
      label: "Say Hello",
    });
  }

}
