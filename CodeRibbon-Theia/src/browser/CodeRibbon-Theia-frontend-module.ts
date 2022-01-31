/**
 * Generated using theia-extension-generator
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import {
  Command, CommandContribution, CommandRegistry,
  MenuContribution, MenuModelRegistry, MessageService
} from '@theia/core/lib/common';

// import { CodeRibbonTheiaContribution } from './CodeRibbon-Theia-contribution';
import { CodeRibbonTheiaCommandContribution } from './CodeRibbon-Theia-commands';
import { CodeRibbonTheiaMenuContribution } from './CodeRibbon-Theia-menus';

export default new ContainerModule(bind => {

    // Replace this line with the desired binding, e.g. "bind(CommandContribution).to(CodeRibbonTheiaContribution)
    bind(CommandContribution).to(CodeRibbonTheiaCommandContribution);
    bind(MenuContribution).to(CodeRibbonTheiaMenuContribution);
});
