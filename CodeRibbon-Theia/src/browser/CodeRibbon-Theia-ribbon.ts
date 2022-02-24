import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';

import {
  TabBar, Widget, Title,
  DockPanel, BoxPanel,
  DockLayout, BoxLayout,
} from '@phosphor/widgets';
import {
  MessageService,
  FrontendApplication, FrontendApplicationContribution,
} from '@theia/core/lib/common';
import {
  FrontendApplicationStateService,
} from '@theia/core/lib/browser/frontend-application-state';
import {
  CorePreferences,
} from '@theia/core/lib/browser/core-preferences';

import {crdebug} from './CodeRibbon-logger';

// Main Ribbon View replacement
@injectable()
export class CodeRibbonTheiaRibbonView extends BoxPanel {

  constructor(options?: BoxPanel.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    super(options);
    if (preferences) {
      preferences.onPreferenceChanged(preference => {
        crdebug("preference change:", preference);
      });
    }
  }

  @inject(MessageService) private readonly messageService!: MessageService,


}
