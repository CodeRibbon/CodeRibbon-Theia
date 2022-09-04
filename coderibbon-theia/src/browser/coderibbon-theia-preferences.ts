// @ts-nocheck

import { injectable } from '@theia/core/shared/inversify';

import {
  MessageService,
} from '@theia/core/lib/common';
import {
  PreferenceContribution, PreferenceSchema,
} from '@theia/core/lib/browser/preferences'

import {crdebug} from './cr-logger';

export const CodeRibbonTheiaPreferenceSchema: PreferenceSchema = {
  "type": "object",
  "properties": {
    // "ribbon.patchesPerScreenCalculation": {
    //   "type": "object",
    //   "description": "Method for determining how many patch columns should be shown on screen.",
    //   "order": 30,
    //   "properties": {
    //     "pane_count_horizontal_mode": {
    //       "title": "Horizontal Patch Count",
    //       "order": 32,
    //       "type": "string",
    //       "default": "linelength",
    //       "enum": [
    //         {
    //           "value": "linelength",
    //           "description": "Automatic: Use your preference for the editor's Preferred Line Width"
    //         },
    //         {
    //           "value": "cr-linelength",
    //           "description": "Automatic: Use the Minimum Characters Wide setting below"
    //         },
    //         {
    //           "value": "number",
    //           "description": "Manual: Use a specific number of horizontal patches."
    //         }
    //       ]
    //     },
    //     "pane_count_horizontal_min_chars": {
    //       "title": "Automatic: Minimum Characters Wide",
    //       "order": 34,
    //       "description": "Choose how many columns a patch needs to show at minimum in order to be useful. Please change the above setting to activate this.",
    //       "type": "integer",
    //       "default": 80
    //     },
    //     "pane_count_horizontal_number": {
    //       "title": "Manual: Number of horizontal patches",
    //       "order": 33,
    //       "description": "Choose an exact number of patches to show per screen horizontally. This setting is also is used as the fallback in case automatic width detection fails.",
    //       "type": "integer",
    //       "default": 3
    //     },
    //     "pane_count_vertical_number": {
    //       "title": "Number of Patches per Column",
    //       "order": 36,
    //       "description": "How many vertical patches should new columns be initialized with?",
    //       "type": "integer",
    //       "default": 2
    //     }
    //   }
    // },
    // "ribbon.patch_creation_strategy": {
    //   "title": "Placement of newly opened files",
    //   "order": 41,
    //   "description": "When adding items to the ribbon without any empty patches on-screen, where should they be created?",
    //   "type": "string",
    //   "default": "nearest_right",
    //   "enum": [
    //     {
    //       "value": "ribbon_tail",
    //       "description": "Always at the end of the ribbon, leaving prior empty patches alone"
    //     },
    //     {
    //       "value": "new_column",
    //       "description": "Create a new column right next to your currently focused one"
    //     },
    //     {
    //       "value": "nearest_right",
    //       "description": "Find the closest empty patch rightwards of your current position"
    //     },
    //     {
    //       "value": "split_down",
    //       "description": "Add a patch to the current column"
    //     }
    //   ]
    // },
    // "ribbon.snap_alignment": {
    //   "type": "object",
    //   "title": "Horizontal Scroll Snap",
    //   "properties": {
    //     "autoscroll_timeout": {
    //       "title": "Delay until columns are auto-aligned to screen",
    //       "description": "Wait this number of seconds after scrolling to automatically align the viewport to the nearest patch column. Set to zero to disable the auto-snapping to columns. Values between 0 and 0.5 are not recommended for physical scrollwheel users.",
    //       "default": 1,
    //       "type": "number",
    //       "minimum": 0,
    //       "maximum": 30
    //     },
    //     "distance_cutoff": {
    //       "title": "Max distance to align",
    //       "description": "How close do you have to be to a column for the auto-snap to align? You can express this either as a percentage (of the current column width) or as a number of pixels.",
    //       "default": "20%",
    //       "type": "string",
    //       "pattern": "^[0-9]+%?$"
    //     }
    //   }
    // }
  }
}
