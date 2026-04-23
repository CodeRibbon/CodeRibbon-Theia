/** @format */

import { ContainerModule } from "@theia/core/shared/inversify";

import {
  Command,
  CommandRegistry,
  MenuContribution,
  CommandContribution,
  MenuModelRegistry,
  MessageService,
  CorePreferences,
  quickInputServicePath,
} from "@theia/core/lib/common";
import { PreferenceContribution } from "@theia/core/lib/common/preferences";
import { ApplicationShell } from "@theia/core/lib/browser/shell/application-shell";
import {
  bindViewContribution,
  DockPanel,
  FrontendApplicationContribution,
  KeybindingContribution,
  WebSocketConnectionProvider,
  WidgetFactory,
  WidgetManager,
} from "@theia/core/lib/browser";

// import { CodeRibbonTheiaRibbonViewContribution } from './coderibbon-theia-ribbon';
import { CodeRibbonTheiaCommandContribution } from "./coderibbon-theia-commands";
import { CodeRibbonTheiaMenuContribution } from "./coderibbon-theia-menus";
import { CodeRibbonTheiaPreferenceSchema } from "./coderibbon-theia-preferences";
import { CodeRibbonTheiaManager } from "./coderibbon-theia-manager";
import { CodeRibbonApplicationShell } from "./cr-application-shell";
import { CodeRibbonTheiaRibbonPanel } from "./cr-ribbon";
import { CodeRibbonTheiaPatch } from "./cr-patch";
import { CodeRibbonTheiaKeybindingContribution } from "./coderibbon-theia-keybinds";
import {
  CodeRibbonFuzzyFileOpenerWidget,
  CodeRibbonFuzzyFileOpenerContribution,
} from "./cr-fuzzy-file-opener";
import {
  EmbeddableMonacoQuickInputImplementation,
  EmbeddableMonacoQuickInputService,
} from "./embeddable-mqis";

import "../../src/browser/style/ribbon.less";
// temp CSS
import "../../src/browser/style/debug.less";
import { crdebug } from "./cr-logger";
import { TheiaDockPanel } from "@theia/core/lib/browser/shell/theia-dock-panel";

export default new ContainerModule((bind, unbind, isBound, rebind) => {
  bind(CodeRibbonApplicationShell).toSelf().inSingletonScope();
  // get rid of original ApplicationShell:
  // @ts-ignore
  rebind(ApplicationShell).to(CodeRibbonApplicationShell).inSingletonScope();

  // this is how we sneak the inversify container into the non-injectable CR classes
  // (instead of doing the cheap/unstable window.theia.container workaround)
  bind(CodeRibbonTheiaRibbonPanel.Factory).toFactory(
    ({ container }) =>
      (options: Partial<CodeRibbonTheiaRibbonPanel.IOptions>) => {
        return new CodeRibbonTheiaRibbonPanel({
          alignment: "start",
          direction: "left-to-right",
          spacing: 0,
          mode: "multiple-document",
          container,
          ...options,
        });
      },
  );

  bind(CommandContribution).to(CodeRibbonTheiaCommandContribution);
  bind(MenuContribution).to(CodeRibbonTheiaMenuContribution);
  bind(KeybindingContribution).to(CodeRibbonTheiaKeybindingContribution);

  // https://github.com/eclipse-theia/theia/blob/008c8340465f7e42298839881d814863bef0b039/packages/monaco/src/browser/monaco-frontend-module.ts#L166-L171
  // bind(EmbeddableMonacoQuickInputImplementation).toSelf().inSingletonScope();
  // bind(EmbeddableMonacoQuickInputService)
  //   .toSelf()
  //   .inSingletonScope()
  //   .onActivation(
  //     ({ container }, quickInputService: EmbeddableMonacoQuickInputService) => {
  //       WebSocketConnectionProvider.createHandler(
  //         container,
  //         quickInputServicePath,
  //         quickInputService,
  //       );
  //       return quickInputService;
  //     },
  //   );

  // crdebug("now binding the CRFFO widget");
  // CRFFO widget
  bind(CodeRibbonFuzzyFileOpenerWidget).toSelf();
  bind(WidgetFactory)
    .toDynamicValue((ctx) => ({
      id: CodeRibbonFuzzyFileOpenerWidget.ID,
      createWidget: () =>
        ctx.container.get<CodeRibbonFuzzyFileOpenerWidget>(
          CodeRibbonFuzzyFileOpenerWidget,
        ),
    }))
    .inSingletonScope();

  // opener
  bindViewContribution(bind, CodeRibbonFuzzyFileOpenerContribution);
  bind(FrontendApplicationContribution).toService(
    CodeRibbonFuzzyFileOpenerContribution,
  );

  // TODO fix prefs
  // bind(PreferenceContribution).toConstantValue({
  //   schema: CodeRibbonTheiaPreferenceSchema});
});
