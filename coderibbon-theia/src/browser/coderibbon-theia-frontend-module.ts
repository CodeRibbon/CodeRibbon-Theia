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

// import { CodeRibbonTheiaRibbonViewContribution } from './coderibbon-theia-ribbon';
import { CodeRibbonTheiaCommandContribution } from './coderibbon-theia-commands';
import { CodeRibbonTheiaMenuContribution } from './coderibbon-theia-menus';
import { CodeRibbonTheiaPreferenceSchema } from './coderibbon-theia-preferences';
import { CodeRibbonTheiaManager } from './coderibbon-theia-manager';
import { CodeRibbonTheiaRibbonPanel } from './cr-ribbon';
import { CodeRibbonApplicationShell } from './cr-application-shell';

import '../../src/browser/style/ribbon.less';
// temp CSS
import '../../src/browser/style/debug.less';

export default new ContainerModule((bind, unbind, isBound, rebind) => {

  bind(CodeRibbonApplicationShell).toSelf().inSingletonScope();
  // get rid of original ApplicationShell:
  // @ts-ignore
  rebind(ApplicationShell).to(CodeRibbonApplicationShell).inSingletonScope();

  bind(CommandContribution).to(CodeRibbonTheiaCommandContribution);
  bind(MenuContribution).to(CodeRibbonTheiaMenuContribution);

  // TODO fix prefs
  // bind(PreferenceContribution).toConstantValue({
  //   schema: CodeRibbonTheiaPreferenceSchema});
});
