/** @format */

import { injectable, inject } from "@theia/core/shared/inversify";

// import {
//   Command,
//   // CommandContribution,
//   // CommandRegistry,
//   // MessageService,
// } from "@theia/core/lib/common";
import {
  ApplicationShell,
  KeybindingContribution,
  KeybindingRegistry,
} from "@theia/core/lib/browser";

import { CodeRibbonApplicationShell } from "./cr-application-shell";
import { CodeRibbonTheiaRibbonStrip } from "./cr-ribbon-strip";

import { crdebug } from "./cr-logger";

import {
  CodeRibbonNavigationCommands,
  CodeRibbonManipulationCommands,
  CodeRibbonArrangementCommands,
} from "./coderibbon-theia-commands";

export const CodeRibbonDefaultKeybindings = [
  {
    keybinding: "ctrl+tab",
    command: CodeRibbonNavigationCommands.moveFocusNext.id,
    // when: "editorFocus"
  },
  {
    keybinding: "ctrl+shift+tab",
    command: CodeRibbonNavigationCommands.moveFocusPrev.id,
    // when: "editorFocus"
  },
];

@injectable()
export class CodeRibbonTheiaKeybindingContribution
  implements KeybindingContribution
{
  // constructor(
  //   @inject(MessageService) private readonly messageService: MessageService,
  //   // @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService,
  //   // @inject(PreferenceService) protected readonly prefService: PreferenceService,
  //   // @inject(CodeRibbonApplicationShell) private readonly cras: CodeRibbonApplicationShell,
  //   @inject(ApplicationShell) protected readonly applicationShell: CodeRibbonApplicationShell,
  // ) {}

  registerKeybindings(keybindings: KeybindingRegistry): void {
    CodeRibbonDefaultKeybindings.forEach((kb) => {
      crdebug("Loading keybinding:", kb);
      keybindings.registerKeybinding(kb);
    });
  }
}
