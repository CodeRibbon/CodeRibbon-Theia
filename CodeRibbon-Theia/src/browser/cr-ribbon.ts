import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import { Signal } from '@phosphor/signaling';
import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
} from '@phosphor/widgets';
import {
  MessageService,
  Emitter, environment,
  Disposable, DisposableCollection,
} from '@theia/core/lib/common';
import {
  TheiaDockPanel, BOTTOM_AREA_ID, MAIN_AREA_ID, MAXIMIZED_CLASS,
} from '@theia/core/lib/browser/shell/theia-dock-panel';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';

import { crdebug } from './CodeRibbon-logger';

// was not exported from TheiaDockPanel for some reason?
const VISIBLE_MENU_MAXIMIZED_CLASS = 'theia-visible-menu-maximized';


// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
@injectable()
export class CodeRibbonTheiaRibbonPanel extends TheiaDockPanel {

  // static readonly ID = 'cr-theia-ribbon'; // there should only ever be one

  // constructor(options?: BoxPanel.IOptions,
  //   // @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  // ) {
  //   super(options);
  //   // if (preferences) {
  //   //   preferences.onPreferenceChanged(preference => {
  //   //     crdebug("ribbon: preference change:", preference);
  //   //   });
  //   // }
  // }

}
