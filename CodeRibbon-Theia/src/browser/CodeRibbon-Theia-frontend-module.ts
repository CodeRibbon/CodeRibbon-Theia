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
import {
  ApplicationShell,
} from '@theia/core/lib/browser/shell/application-shell';

// import { CodeRibbonTheiaRibbonViewContribution } from './CodeRibbon-Theia-ribbon';
import { CodeRibbonTheiaCommandContribution } from './CodeRibbon-Theia-commands';
import { CodeRibbonTheiaMenuContribution } from './CodeRibbon-Theia-menus';
import { CodeRibbonTheiaPreferenceSchema } from './CodeRibbon-Theia-preferences';
import { CodeRibbonTheiaManager } from './CodeRibbon-Theia-manager';
import { CodeRibbonTheiaRibbonPanel } from './cr-ribbon';
import { CodeRibbonApplicationShell } from './cr-application-shell';

export default new ContainerModule((bind, unbind, isBound, rebind) => {

  bind(CodeRibbonApplicationShell).toSelf().inSingletonScope();
  // get rid of original ApplicationShell:
  rebind(ApplicationShell).to(CodeRibbonApplicationShell).inSingletonScope();

  bind(CommandContribution).to(CodeRibbonTheiaCommandContribution);
  bind(MenuContribution).to(CodeRibbonTheiaMenuContribution);

  // TODO fix prefs
  // bind(PreferenceContribution).toConstantValue({
  //   schema: CodeRibbonTheiaPreferenceSchema});
});
