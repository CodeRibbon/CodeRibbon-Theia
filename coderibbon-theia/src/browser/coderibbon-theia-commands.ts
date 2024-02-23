import { injectable, inject } from "@theia/core/shared/inversify";

import {
  Command,
  CommandContribution,
  CommandRegistry,
  MessageService,
} from "@theia/core/lib/common";
import { ApplicationShell } from "@theia/core/lib/browser";

import { CodeRibbonApplicationShell } from "./cr-application-shell";
import { CodeRibbonTheiaRibbonStrip } from "./cr-ribbon-strip";

import { crdebug } from "./cr-logger";

export const CodeRibbonDebuggingCommands = {
  helloWorldCommand: {
    id: "CodeRibbon.HelloWorld",
    label: "Hello, CodeRibbon.",
  },
  testFuzzyFinderCommand: {
    id: "CodeRibbon.dev.test_ff",
    label: "CodeRibbon Test FuzzyFinder",
  },
};

export const CodeRibbonDevGetPanelCommand = {
  id: "CodeRibbon.dev.getDockPanel",
  label: "dev: getDockPanel",
};

// commands that do not modify the layout / ordering of the ribbon
export const CodeRibbonNavigationCommands = {
  moveFocusUp: {
    id: "CodeRibbon.nav.focus_up",
    label: "Focus Patch Above",
  },
  moveFocusDown: {
    id: "CodeRibbon.nav.focus_down",
    label: "Focus Patch Below",
  },
  moveFocusRight: {
    id: "CodeRibbon.nav.focus_right",
    label: "Focus Patch Rightwards",
  },
  moveFocusLeft: {
    id: "CodeRibbon.nav.focus_left",
    label: "Focus Patch Leftwards",
  },
  moveFocusNext: {
    id: "CodeRibbon.nav.focus_next",
    label: "Focus next Patch",
  },
  moveFocusPrev: {
    id: "CodeRibbon.nav.focus_prev",
    label: "Focus previous Patch",
  },
  moveFocusRibbonStart: {
    id: "CodeRibbon.nav.focus_ribbon_start",
    label: "Focus the first Patch in the Ribbon",
  },
  moveFocusRibbonTail: {
    id: "CodeRibbon.nav.focus_ribbon_tail",
    label: "Focus the last Patch in the Ribbon",
  },
  moveFocusRibbonEnd: {
    id: "CodeRibbon.nav.focus_ribbon_end",
    label: "Focus an empty Patch at the Ribbon's end",
    // NOTE: option: "next empty patch" vs "first patch in empty column"
  },
};

// commands that create or destroy
export const CodeRibbonManipulationCommands = {
  createStripLeft: {
    id: "CodeRibbon.manip.create_strip_left",
    label: "Create a new column to the left",
  },
  createStripRight: {
    id: "CodeRibbon.manip.create_strip_right",
    label: "Create a new column to the right",
  },
  createPatchBelow: {
    id: "CodeRibbon.manip.create_patch_below",
    label: "Create a new Patch below the current",
  },
  createPatchAbove: {
    id: "CodeRibbon.manip.create_patch_above",
    label: "Create a new Patch above the current",
  },
  splitPatchDown: {
    id: "CodeRibbon.manip.split_patch_down",
    label: "Split the current Patch into two",
  },
  // skip splitPatchUp for now, end result is the same as:
  // splitPatchDown and moveFocusUp
  closeStrip: {
    id: "CodeRibbon.manip.close_strip",
    label: "Close the current column",
  },
  clearPatch: {
    // aka get rid of the editor in the patch without destroying the patch
    id: "CodeRibbon.manip.clear_patch",
    label: "Empty the current patch",
  },
  closePatch: {
    id: "CodeRibbon.manip.close_patch",
    label: "Close the current patch",
  },
};

// commands that do not create nor delete, only reorganize / reorder
export const CodeRibbonArrangementCommands = {
  moveStripRight: {
    id: "CodeRibbon.arrange.move_strip_right",
    label: "Move column rightwards",
  },
  moveStripLeft: {
    id: "CodeRibbon.arrange.move_strip_left",
    label: "Move column leftwards",
  },
  movePatchDown: {
    id: "CodeRibbon.arrange.move_patch_down",
    label: "Move patch down",
  },
  movePatchUp: {
    id: "CodeRibbon.arrange.move_patch_up",
    label: "Move patch up",
  },
};

@injectable()
// Add contribution interface to be implemented, e.g. "CodeRibbonTheiaContribution implements CommandContribution"
export class CodeRibbonTheiaCommandContribution implements CommandContribution {
  constructor(
    @inject(MessageService) private readonly messageService: MessageService,
    // @inject(FrontendApplicationStateService) protected readonly stateService: FrontendApplicationStateService,
    // @inject(PreferenceService) protected readonly prefService: PreferenceService,
    // @inject(CodeRibbonApplicationShell) private readonly cras: CodeRibbonApplicationShell,
    @inject(ApplicationShell)
    protected readonly applicationShell: CodeRibbonApplicationShell,
  ) {}

  registerCommands(registry: CommandRegistry): void {

    // === NOTE: Debugging section
    // TODO: only register these in debug mode

    registry.registerCommand(CodeRibbonDebuggingCommands.helloWorldCommand, {
      execute: () => {
        this.messageService.info("CodeRibbon says hello!");
        crdebug("Hello console! CommandContribution:", this);
        // crdebug("CRAS is:", this.cras);
      },
    });
    registry.registerCommand(CodeRibbonDebuggingCommands.testFuzzyFinderCommand, {
      execute: () => {
        crdebug();
      }
    });

    // === NOTE: Nav section

    registry.registerCommand(CodeRibbonNavigationCommands.moveFocusNext, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch currently in focus.");
          return;
        }
        let cur_patch = strip.mru_patch;
        if (!cur_patch) {
          this.messageService.warn("No active patch.");
          return;
        }
        crdebug("moveFocusNext:", cur_patch);
        let cur_patch_idx = strip._patches.indexOf(cur_patch);
        let next_patch = strip.get_sibling(cur_patch, "after");
        if (!next_patch) {
          let next_strip = ribbon.get_sibling(strip, "after");
          if (!(next_strip instanceof CodeRibbonTheiaRibbonStrip)) {
            this.messageService.warn("Reached the end of the Ribbon.");
            return;
          }
          next_patch = next_strip._patches[0];
        }
        // next_patch.activate();
        ribbon.activateWidget(next_patch);
      },
    });

    registry.registerCommand(CodeRibbonNavigationCommands.moveFocusPrev, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch currently in focus.");
          return;
        }
        let cur_patch = strip.mru_patch;
        if (!cur_patch) {
          this.messageService.warn("No active patch.");
          return;
        }
        crdebug("moveFocusPrev:", cur_patch);
        let cur_patch_idx = strip._patches.indexOf(cur_patch);
        let prev_patch = strip.get_sibling(cur_patch, "before");
        if (!prev_patch) {
          let prev_strip = ribbon.get_sibling(strip, "before");
          if (!(prev_strip instanceof CodeRibbonTheiaRibbonStrip)) {
            this.messageService.warn("Reached the start of the Ribbon.");
            return;
          }
          prev_patch = prev_strip._patches[prev_strip._patches.length - 1];
        }
        // next_patch.activate();
        ribbon.activateWidget(prev_patch);
      },
    });

    // === NOTE: Manip section

    registry.registerCommand(CodeRibbonManipulationCommands.createStripLeft, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        crdebug("createStripLeft ribbon:", ribbon);
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch currently in focus.");
          return;
        }
        let cur_index = ribbon._strips.indexOf(strip!);
        if (cur_index < 0)
          throw Error(
            "did not find a valid index for the currently active strip",
          );
        ribbon.createNewRibbonStrip({
          index: cur_index,
        });
      },
    });

    registry.registerCommand(CodeRibbonManipulationCommands.createStripRight, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        crdebug("createStripRight ribbon:", ribbon);
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch currently in focus.");
          return;
        }
        let cur_index = ribbon._strips.indexOf(strip!);
        if (cur_index < 0)
          throw Error(
            "did not find a valid index for the currently active strip",
          );
        ribbon.createNewRibbonStrip({
          index: cur_index + 1, // right side
        });
      },
    });

    registry.registerCommand(CodeRibbonManipulationCommands.closeStrip, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        crdebug("closeStrip", ribbon);
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch currently in focus.");
          return;
        }
        // TODO prompt if there are unsaved changes in this strip
        strip.dispose();
      },
    });

    // === NOTE: Arrange section

    registry.registerCommand(CodeRibbonArrangementCommands.moveStripLeft, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        crdebug("moveStripLeft", ribbon);
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch in focus!");
          return;
        }
        let curidx = ribbon._strips.indexOf(strip!);
        if (curidx <= 0) {
          this.messageService.warn("Reached the beginning of the Ribbon!");
          return;
        }
        ribbon.insertWidget(curidx - 1, strip as CodeRibbonTheiaRibbonStrip);
        setTimeout(() => {
          // setTimeout because update will happen after animation frame
          ribbon
            .scrollStripIntoView(strip as CodeRibbonTheiaRibbonStrip, {
              wait_for_transition: true,
            })
            .then(() => {
              ribbon.autoAdjustRibbonTailLength();
            });
        });
      },
    });
    registry.registerCommand(CodeRibbonArrangementCommands.moveStripRight, {
      execute: () => {
        let ribbon = this.applicationShell.mainPanel;
        crdebug("moveStripRight", ribbon);
        let strip = ribbon.mru_strip;
        if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
          this.messageService.warn("No patch in focus!");
          return;
        }
        let curidx = ribbon._strips.indexOf(strip!);
        if (curidx >= ribbon._strips.length) {
          this.messageService.warn("Reached the end of the Ribbon!");
          return;
        }
        ribbon.insertWidget(curidx + 1, strip as CodeRibbonTheiaRibbonStrip);
        ribbon.autoAdjustRibbonTailLength();
        setTimeout(() => {
          ribbon.scrollStripIntoView(strip as CodeRibbonTheiaRibbonStrip, {
            wait_for_transition: true,
          });
        });
      },
    });
  }
}
