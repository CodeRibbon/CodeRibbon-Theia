import { injectable, inject } from '@theia/core/shared/inversify';

import {
  Command, CommandContribution, CommandRegistry,
  MessageService,
} from '@theia/core/lib/common';

import {crdebug} from './cr-logger';

export const CodeRibbonHelloWorldCommand = {
  id: 'CodeRibbon.HelloWorld',
  label: "Hello, CodeRibbon.",
}

export const CodeRibbonDevGetPanelCommand = {
  id: 'CodeRibbon.dev.getDockPanel',
  label: "dev: getDockPanel",
}

// commands that do not modify the layout / ordering of the ribbon
export const CodeRibbonNavigationCommands = {
  moveFocusUp: {
    id: 'CodeRibbon.nav.focus_up',
    label: "Focus Patch Above",
  },
  moveFocusDown: {
    id: 'CodeRibbon.nav.focus_down',
    label: "Focus Patch Below",
  },
  moveFocusRight: {
    id: 'CodeRibbon.nav.focus_right',
    label: "Focus Patch Rightwards",
  },
  moveFocusLeft: {
    id: 'CodeRibbon.nav.focus_left',
    label: "Focus Patch Leftwards",
  },
  moveFocusNext: {
    id: 'CodeRibbon.nav.focus_next',
    label: "Focus next Patch",
  },
  moveFocusPrev: {
    id: 'CodeRibbon.nav.focus_prev',
    label: "Focus previous Patch",
  },
  moveFocusRibbonStart: {
    id: 'CodeRibbon.nav.focus_ribbon_start',
    label: "Focus the first Patch in the Ribbon",
  },
  moveFocusRibbonTail: {
    id: 'CodeRibbon.nav.focus_ribbon_tail',
    label: "Focus the last Patch in the Ribbon",
  },
  moveFocusRibbonEnd: {
    id: 'CodeRibbon.nav.focus_ribbon_end',
    label: "Focus an empty Patch at the Ribbon's end",
    // NOTE: option: "next empty patch" vs "first patch in empty column"
  },
}

// commands that create or destroy
export const CodeRibbonManipulationCommands = {
  createStripLeft: {
    id: 'CodeRibbon.manip.create_strip_left',
    label: "Create a new column to the left",
  },
  createStripRight: {
    id: 'CodeRibbon.manip.create_strip_right',
    label: "Create a new column to the right",
  },
  createPatchBelow: {
    id: 'CodeRibbon.manip.create_patch_below',
    label: "Create a new Patch below the current",
  },
  createPatchAbove: {
    id: 'CodeRibbon.manip.create_patch_above',
    label: "Create a new Patch above the current",
  },
  splitPatchDown: {
    id: 'CodeRibbon.manip.split_patch_down',
    label: "Split the current Patch into two",
  },
  // skip splitPatchUp for now, end result is the same as:
  // splitPatchDown and moveFocusUp
  closeStrip: {
    id: 'CodeRibbon.manip.close_strip',
    label: "Close the current column",
  },
  clearPatch: {
    // aka get rid of the editor in the patch without destroying the patch
    id: 'CodeRibbon.manip.clear_patch',
    label: "Empty the current patch",
  },
  closePatch: {
    id: 'CodeRibbon.manip.close_patch',
    label: "Close the current patch",
  },
}

// commands that do not create nor delete, only reorganize / reorder
export const CodeRibbonArrangementCommands = {
  moveStripRight: {
    id: 'CodeRibbon.arrange.move_strip_right',
    label: "Move column rightwards",
  },
  moveStripLeft: {
    id: 'CodeRibbon.arrange.move_strip_left',
    label: "Move column leftwards",
  },
  movePatchDown: {
    id: 'CodeRibbon.arrange.move_patch_down',
    label: "Move patch down",
  },
  movePatchUp: {
    id: 'CodeRibbon.arrange.move_patch_up',
    label: "Move patch up",
  },
}

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaCommandContribution implements CommandContribution {

  constructor(
    @inject(MessageService) private readonly messageService: MessageService,
    // @inject(PreferenceService) protected readonly prefService: PreferenceService,
  ) {}

  registerCommands(registry: CommandRegistry): void {
    registry.registerCommand(CodeRibbonHelloWorldCommand, {
      execute: () => {
        this.messageService.info("CodeRibbon says hello!");
        crdebug("Hello console! CommandContribution:", this);
      }
    });
    registry.registerCommand(CodeRibbonDevGetPanelCommand, {
      execute: () => {
        crdebug();
      }
    });
  }

}
