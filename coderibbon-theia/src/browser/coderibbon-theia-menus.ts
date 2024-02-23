import { injectable } from "@theia/core/shared/inversify";

import { CommonMenus } from "@theia/core/lib/browser";
import {
  MenuContribution,
  MenuModelRegistry,
  MessageService,
  MenuPath,
  MAIN_MENU_BAR,
} from "@theia/core/lib/common";

import {
  CodeRibbonDebuggingCommands,
  CodeRibbonNavigationCommands,
  CodeRibbonManipulationCommands,
  CodeRibbonArrangementCommands,
} from "./coderibbon-theia-commands";

export const CodeRibbonTopMenuPath = [...MAIN_MENU_BAR, "7_coderibbon"];
export const CodeRibbonNavigationMenu = [
  ...CodeRibbonTopMenuPath,
  "1_navigation",
];
export const CodeRibbonManipulationMenu = [
  ...CodeRibbonTopMenuPath,
  "2_manipulation",
];
export const CodeRibbonArrangementMenu = [
  ...CodeRibbonTopMenuPath,
  "3_arrangement",
];

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaMenuContribution implements MenuContribution {
  registerMenus(menus: MenuModelRegistry): void {
    menus.registerSubmenu(CodeRibbonTopMenuPath, "CodeRibbon");

    // General

    menus.registerMenuAction(CodeRibbonTopMenuPath, {
      commandId: CodeRibbonDebuggingCommands.testFuzzyFinderCommand.id,
      label: "Test FuzzyFinder",
    });

    // Navigation

    menus.registerMenuAction(CodeRibbonNavigationMenu, {
      commandId: CodeRibbonNavigationCommands.moveFocusNext.id,
      label: "Move focus to next patch",
    });

    // Manip

    menus.registerMenuAction(CodeRibbonManipulationMenu, {
      commandId: CodeRibbonManipulationCommands.createStripLeft.id,
      label: "Create Column Left",
    });
    menus.registerMenuAction(CodeRibbonManipulationMenu, {
      commandId: CodeRibbonManipulationCommands.createStripRight.id,
      label: "Create Column Right",
    });
    menus.registerMenuAction(CodeRibbonManipulationMenu, {
      commandId: CodeRibbonManipulationCommands.closeStrip.id,
      label: "Close Strip",
    });

    // Arrangement

    menus.registerMenuAction(CodeRibbonArrangementMenu, {
      commandId: CodeRibbonArrangementCommands.moveStripLeft.id,
      label: "Move Column Left",
    });
    menus.registerMenuAction(CodeRibbonArrangementMenu, {
      commandId: CodeRibbonArrangementCommands.moveStripRight.id,
      label: "Move Column Right",
    });
  }
}
