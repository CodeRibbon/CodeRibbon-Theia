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


export
namespace RibbonPanel {
  export
  type InsertMode = (
    // At the tail of the ribbon:
    // the empty patch directly following the last/rightmost contentful patch
    'ribbon-tail' |

    // Place a new patch above or below the current one in this column
    'split-down' |
    'split-up' |

    // Place a new patch at the top or bottom of this column
    'split-top' |
    'split-bottom' |

    // Create a new column on the right or left of the current, put widget there
    'split-right' |
    'split-left' |

    // Place the widget such that it ends up in either the right or left
    // on-screen column, creating a new one if no empty patches are available
    'screen-right' |
    'screen-left'
  )
  export
  interface IAddOptions {
    /**
     * Options for inserting a Widget onto the Ribbon
     */
    mode?: InsertMode;
    /**
     * If a widget reference is specified here, perform the insert relative
     * to that widget instead of the active one.
     */
    ref?: Widget | null;
    /**
     * If true, the insertion will overwrite an empty Patch if there is already
     * one in the target insertion location
     */
    useEmpty?: boolean;
  }
}

// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
@injectable()
export class CodeRibbonTheiaRibbonPanel extends BoxPanel {

  /**
   * Emitted when a widget is added to the panel.
   */
  readonly widgetAdded = new Signal<this, Widget>(this);
  /**
   * Emitted when a widget is activated by calling `activateWidget`.
   */
  readonly widgetActivated = new Signal<this, Widget>(this);
  /**
   * Emitted when a widget is removed from the panel.
   */
  readonly widgetRemoved = new Signal<this, Widget>(this);

  protected readonly onDidToggleMaximizedEmitter = new Emitter<Widget>();
  readonly onDidToggleMaximized = this.onDidToggleMaximizedEmitter.event;

  constructor(options?: BoxPanel.IOptions,
    // @inject(CorePreferences) protected readonly preferences?: CorePreferences,
  ) {
    super(options);
    // if (preferences) {
    //   preferences.onPreferenceChanged(preference => {
    //     crdebug("ribbon: preference change:", preference);
    //   });
    // }
  }

  override addWidget(widget: Widget, options?: RibbonPanel.IAddOptions): void {
    // TODO logic based on where to put the widget
    super.addWidget(widget);
    this.widgetAdded.emit(widget);
  }

  // TODO is this actually an override?
  override activateWidget(widget: Widget): void {
    // TODO does BoxPanel need an activateWidget?
    crdebug("RibbonPanel activateWidget");
    super.activate();
    this.widgetActivated.emit(widget);
  }

  // NOTE === phosphor DockPanel API compatility section === NOTE //

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  restoreLayout(config: BoxLayout.ILayoutConfig): void {
    // TODO
  }

  widgets(): IIterator<Widget> {
    // TODO iterate widgets in order of ribbon layout
    return (this.layout as BoxLayout).widgets();
  }

  tabBars(): IIterator<TabBar<Widget>> {
    // TODO removal of tabBars
    return this._root ? this._root.iterTabBars() : empty<TabBar<Widget>>();
  }

  // NOTE === theia DockPanel API compatility section === NOTE //

  isElectron(): boolean {
    return environment.electron.is();
  }

  protected readonly toDisposeOnMarkAsCurrent = new DisposableCollection();
  markAsCurrent(title: Title<Widget> | undefined): void {
    this.toDisposeOnMarkAsCurrent.dispose();
    this._currentTitle = title;
    if (title) {
      const resetCurrent = () => this.markAsCurrent(undefined);
      title.owner.disposed.connect(resetCurrent);
      this.toDisposeOnMarkAsCurrent.push(Disposable.create(() =>
        title.owner.disposed.disconnect(resetCurrent)
      ));
    }
  }

  protected maximizedElement: HTMLElement | undefined;
  protected getMaximizedElement(): HTMLElement {
    if (!this.maximizedElement) {
      this.maximizedElement = document.createElement('div');
      this.maximizedElement.style.display = 'none';
      document.body.appendChild(this.maximizedElement);
    }
    return this.maximizedElement;
  }

  protected handleMenuBarVisibility(newValue: string): void {
    const areaContainer = this.node.parentElement;
    const maximizedElement = this.getMaximizedElement();

    if (areaContainer === maximizedElement) {
      if (newValue === 'visible') {
        this.addClass(VISIBLE_MENU_MAXIMIZED_CLASS);
      } else {
        this.removeClass(VISIBLE_MENU_MAXIMIZED_CLASS);
      }
    }
  }

  protected _currentTitle: Title<Widget> | undefined;
  get currentTitle(): Title<Widget> | undefined {
    return this._currentTitle;
  }

  get currentTabBar(): TabBar<Widget> | undefined {
    // TODO removal of tab bars
    return this._currentTitle && this.findTabBar(this._currentTitle);
  }

  findTabBar(title: Title<Widget>): TabBar<Widget> | undefined {
    return find(
      this.tabBars(), // original of DockPanel, replacement made for BoxPanel
      bar => ArrayExt.firstIndexOf(bar.titles, title) > -1
    );
  }

}
