import { injectable } from '@theia/core/shared/inversify';

import { CommonMenus } from '@theia/core/lib/browser';
import {
  MenuContribution, MenuModelRegistry, MessageService, MenuPath, MAIN_MENU_BAR,
} from '@theia/core/lib/common';

import { CodeRibbonHelloWorldCommand } from './coderibbon-theia-commands';

export const CodeRibbonTopMenuPath = [...MAIN_MENU_BAR, "7_coderibbon"];

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaMenuContribution implements MenuContribution {

  registerMenus(menus: MenuModelRegistry): void {
    menus.registerSubmenu(CodeRibbonTopMenuPath, "CodeRibbon");

    menus.registerMenuAction(CodeRibbonTopMenuPath, {
      commandId: CodeRibbonHelloWorldCommand.id,
      label: "Say Hello",
    });
  }

}
