/**
 * Generated using theia-extension-generator
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import {
  Command, CommandRegistry,
  MenuContribution, CommandContribution,
  MenuModelRegistry, MessageService,
} from '@theia/core/lib/common';
import {
  FrontendApplicationContribution,
  bindViewContribution, WidgetFactory,
} from '@theia/core/lib/browser';
import { PreferenceContribution } from '@theia/core/lib/browser/preferences';

// import { CodeRibbonTheiaRibbonViewContribution } from './CodeRibbon-Theia-ribbon';
import { CodeRibbonTheiaCommandContribution } from './CodeRibbon-Theia-commands';
import { CodeRibbonTheiaMenuContribution } from './CodeRibbon-Theia-menus';
import { CodeRibbonTheiaPreferenceSchema } from './CodeRibbon-Theia-preferences';
import { CodeRibbonTheiaManager } from './CodeRibbon-Theia-manager';
// import { CodeRibbonTheiaRibbonView } from './cr-ribbon';
// import { CodeRibbonApplicationShell } from './cr-application-shell';

export default new ContainerModule(bind => {

    // Replace this line with the desired binding, e.g. "bind(CommandContribution).to(CodeRibbonTheiaContribution)
    bind(CommandContribution).to(CodeRibbonTheiaCommandContribution);
    bind(MenuContribution).to(CodeRibbonTheiaMenuContribution);
    bind(PreferenceContribution).toConstantValue({
      schema: CodeRibbonTheiaPreferenceSchema});

    // bind(CodeRibbonApplicationShell).toSelf().inSingletonScope();

    // bindViewContribution(bind, CodeRibbonTheiaManagerContribution);
    bind(CodeRibbonTheiaManager).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(CodeRibbonTheiaManager);
    // bind(CodeRibbonTheiaRibbonView).toSelf();
    // bind(WidgetFactory).toDynamicValue(ctx => ({
    //     id: CodeRibbonTheiaRibbonView.ID,
    //     createWidget: () => ctx.container.get<CodeRibbonTheiaRibbonView>(CodeRibbonTheiaRibbonView)
    // })).inSingletonScope();
});
