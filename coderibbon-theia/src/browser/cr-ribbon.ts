import {
  injectable,
  inject,
  postConstruct,
} from "@theia/core/shared/inversify";

import { Signal } from "@phosphor/signaling";
import {
  TabBar,
  Widget,
  Title,
  DockPanel,
  BoxPanel,
  Panel,
  DockLayout,
  BoxLayout,
  FocusTracker,
} from "@phosphor/widgets";
import {
  empty,
  toArray,
  ArrayExt,
  IIterator,
  find,
  iter,
} from "@phosphor/algorithm";
import {
  Message,
  MessageLoop,
  ConflatableMessage
} from "@phosphor/messaging";
import {
  Drag, IDragEvent
} from '@phosphor/dragdrop';
import {
  MimeData
} from '@phosphor/coreutils';
import {
  ElementExt
} from '@phosphor/domutils';
import {
  IDisposable
} from '@phosphor/disposable';

import {
  MessageService,
  Emitter,
  Event as TheiaEvent,
  environment,
  Disposable,
  DisposableCollection,
} from "@theia/core/lib/common";
import { UnsafeWidgetUtilities } from "@theia/core/lib/browser/widgets";
import { ApplicationShell } from "@theia/core/lib/browser";
import {
  TheiaDockPanel,
  BOTTOM_AREA_ID,
  MAIN_AREA_ID,
  MAXIMIZED_CLASS,
} from "@theia/core/lib/browser/shell/theia-dock-panel";
import { FrontendApplicationStateService } from "@theia/core/lib/browser/frontend-application-state";
import { CorePreferences } from "@theia/core/lib/browser/core-preferences";

import { crdebug } from "./cr-logger";
import { CodeRibbonTheiaPatch } from "./cr-patch";
import { CodeRibbonTheiaRibbonStrip } from "./cr-ribbon-strip";
import { CodeRibbonTheiaRibbonLayout } from "./cr-ribbon-layout";
import { RibbonPanel, RibbonStrip } from "./cr-interfaces";

// was not exported from TheiaDockPanel for some reason?
const VISIBLE_MENU_MAXIMIZED_CLASS = "theia-visible-menu-maximized";

// Main Ribbon View replacement
// based primarily on TheiaDockPanel implementation, since that's what it replaces
// as such, license here falls to
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
// @injectable()
export class CodeRibbonTheiaRibbonPanel extends BoxPanel implements EventListenerObject {
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

  private _drag: Drag | null = null;
  private _pressData: Private.IPressData | null = null;
  private _edges: CodeRibbonTheiaRibbonPanel.IEdges;

  private _renderer?: DockLayout.IRenderer;
  private _mode: RibbonPanel.Mode;

  // robobenklein: copied in as response to error:
  /**
    2025-02-04T10:41:01.310Z root ERROR Could not start contribution TypeError: app.shell.mainPanel.onDidChangeCurrent is not a function
      at WorkspaceWindowTitleUpdater.onStart (file:///home/robo/code/coderibbon/CodeRibbon-Theia/electron-app/lib/frontend/bundle.js:76348:29)
   */
  protected readonly onDidChangeCurrentEmitter = new Emitter<Title<Widget> | undefined>();
  get onDidChangeCurrent(): TheiaEvent<Title<Widget> | undefined> {
    return this.onDidChangeCurrentEmitter.event;
  }

  // protected _shell: ApplicationShell = null;
  protected readonly tracker = new FocusTracker<CodeRibbonTheiaRibbonStrip>();

  protected _stripquota: number;

  // prevents automatic modifications to the ribbon
  protected _freeze_ribbon: boolean;

  // drag-drop overlay:
  readonly overlay: DockPanel.IOverlay;

  constructor(
    options?: RibbonPanel.IOptions,
    @inject(CorePreferences) protected readonly preferences?: CorePreferences,
    // TODO: why isn't this getting injected in?
    @inject(MessageService) private readonly messageService?: MessageService,
  ) {
    // @ts-expect-error TS2322: Type 'CodeRibbonTheiaRibbonLayout' is not assignable to type 'BoxLayout'.
    super({ layout: Private.createLayout(options) });
    // Replaced super call with super.super,
    // Panel.prototype.constructor.call(
    //   this, {layout: Private.createLayout(options)}
    // );
    this.addClass("cr-RibbonPanel");

    crdebug("Ribbon constructor:", this, options);
    // if (preferences) {
    //   preferences.onPreferenceChanged(preference => {
    //     crdebug("ribbon: preference change:", preference);
    //   });
    // }
    // TODO debugging only
    // @ts-expect-error TS2339: Property does not exist on type
    if (!window.cr_ribbon) {
      // @ts-expect-error TS2339: Property does not exist on type
      window.cr_ribbon = this;
    } else {
      crdebug("WARNING: multiple ribbon constructions?");
    }

    // TODO restore these
    this._stripquota = 4;
    // this._mru_strip = null;

    this._freeze_ribbon = false;

    // this.overlay = options?.overlay || new DockPanel.Overlay();
    this.overlay = new DockPanel.Overlay();
    this.node.appendChild(this.overlay.node);

    this._renderer = options?.renderer;
    crdebug("Ribbon: renderer", this._renderer);
    this._mode = options?.mode || 'multiple-document';

    // this.autoAdjustRibbonTailLength();
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.node.addEventListener('p-dragenter', this);
    this.node.addEventListener('p-dragleave', this);
    this.node.addEventListener('p-dragover', this);
    this.node.addEventListener('p-drop', this);
    this.node.addEventListener('mousedown', this);

    crdebug("Ribbon onBeforeAttach will run autoAdjustRibbonTailLength");
    this.autoAdjustRibbonTailLength();
  }
  /**
   * A message handler invoked on an `'after-detach'` message.
   */
  protected onAfterDetach(msg: Message): void {
    this.node.removeEventListener('p-dragenter', this);
    this.node.removeEventListener('p-dragleave', this);
    this.node.removeEventListener('p-dragover', this);
    this.node.removeEventListener('p-drop', this);
    this.node.removeEventListener('mousedown', this);
    this._releaseMouse();
  }

  /**
   * handling DOM & phosphor events
   * @param event  DOM event
   *
   * the p-* are the ones used to move patches around, they are from
   * phosphorjs and have the different type and more data
   */
  handleEvent(event: Event): void {
    // crdebug("patch handlin event:", event);
    switch (event.type) {
      case 'p-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'p-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'p-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'p-drop':
        this._evtDrop(event as IDragEvent);
        break;
      case 'dragenter':
      // case 'dragover':
      case 'dragleave':
      case 'drop':
        crdebug("ribbon: raw HTML event TODO");
        break;
      default:
        // crdebug("event not handled!");
        break;
    }
  }

  // These _evt* functions mostly copied from phosphorjs & theia DockPanel
  private _evtDragEnter(event: IDragEvent): void {
    crdebug("ribbon seeing something dragged overhead!", event);
    // If the factory mime type is present, mark the event as
    // handled in order to get the rest of the drag events.
    if (event.mimeData.hasData('application/vnd.phosphor.widget-factory')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  private _evtDragLeave(event: IDragEvent): void {
    // Mark the event as handled.
    event.preventDefault();
    event.stopPropagation();

    // The new target might be a descendant, so we might still handle the drop.
    // Hide asynchronously so that if a p-dragover event bubbles up to us, the
    // hide is cancelled by the p-dragover handler's show overlay logic.
    this.overlay.hide(1);
  }

  private _evtDragOver(event: IDragEvent): void {
    // Mark the event as handled.
    event.preventDefault();
    event.stopPropagation();

    // Show the drop indicator overlay and update the drop
    // action based on the drop target zone under the mouse.
    if (this._showOverlay(event.clientX, event.clientY) === 'invalid') {
      event.dropAction = 'none';
    } else {
      event.dropAction = event.proposedAction;
    }
  }

  private _evtDrop(event: IDragEvent): void {
    // Mark the event as handled.
    event.preventDefault();
    event.stopPropagation();

    // Hide the drop indicator overlay.
    this.overlay.hide(0);

    // Bail if the proposed action is to do nothing.
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }

    // Find the drop target under the mouse.
    let { clientX, clientY } = event;
    let { zone, target } = Private.findDropTarget(
      this,
      clientX,
      clientY,
      this._edges
    );

    // // Bail if the drop zone is invalid.
    if (zone === 'invalid') {
      event.dropAction = 'none';
      return;
    }

    // Bail if the factory mime type has invalid data.
    let mimeData = event.mimeData;
    let factory = mimeData.getData('application/vnd.phosphor.widget-factory');
    if (typeof factory !== 'function') {
      event.dropAction = 'none';
      return;
    }

    // Bail if the factory does not produce a widget.
    let widget = factory();
    if (!(widget instanceof Widget)) {
      event.dropAction = 'none';
      return;
    }

    // Bail if the widget is an ancestor of the dock panel.
    if (widget.contains(this)) {
      event.dropAction = 'none';
      return;
    }

    let source_patch: CodeRibbonTheiaPatch | null = this.whichPatchHasWidget(widget);

    // Find the reference widget for the drop target.
    let ref = target ? Private.getDropRef(target.tabBar) : null;

    let target_patch = ref ? this.whichPatchHasWidget(ref) : null;

    // Add the widget according to the indicated drop zone.
    crdebug("adding the widget from drop!", zone, ref, target_patch, "from patch", source_patch);
    switch(zone) {
    // case 'root-all':
    //   this.addWidget(widget);
    //   break;
    // case 'root-top':
    //   this.addWidget(widget, { mode: 'split-top' });
    //   break;
    // case 'root-left':
    //   this.addWidget(widget, { mode: 'split-left' });
    //   break;
    // case 'root-right':
    //   this.addWidget(widget, { mode: 'split-right' });
    //   break;
    // case 'root-bottom':
    //   this.addWidget(widget, { mode: 'split-bottom' });
    //   break;
    case 'widget-all':
      // TODO swap if from another patch & self not empty
      // this.addWidget(widget, { mode: 'tab-after', ref });
      // this.addWidget(widget, { mode: 'split-down', ref });
      if (target_patch) {
        if (target_patch.contentful_size == 0) {
          target_patch.addWidget(widget);
        }
        else if (source_patch) {
          // TODO swap their contents
        }
      }
      break;
    case 'widget-top':
      this.addWidget(widget, { mode: 'split-up', ref });
      break;
    case 'widget-left':
      this.addWidget(widget, { mode: 'split-left', ref });
      break;
    case 'widget-right':
      this.addWidget(widget, { mode: 'split-right', ref });
      break;
    case 'widget-bottom':
      this.addWidget(widget, { mode: 'split-down', ref });
      break;
    case 'widget-tab':
      // CR TODO should it swap or split? (user feedback pls?)
      // this.addWidget(widget, { mode: 'tab-after', ref });
      this.addWidget(widget, { mode: 'split-up', ref });
      break;
    default:
      throw 'unreachable';
    }

    // Accept the proposed drop action.
    event.dropAction = event.proposedAction;

    // CR TODO: a user preference for "don't remove patches when they become empty"
    if (source_patch?.contentful_size === 0) {
      source_patch.dispose();
    }

    // Activate the dropped widget.
    this.activateWidget(widget);
  }

  /**
   * Two methods here _onCurrentChanged and _onTabActivateRequested
   * originally from DockPanel, overridden by TheiaDockPanel in the constructor:
   * https://github.com/eclipse-theia/theia/blob/05982e8cc568e845f5a08f75a8771328a957e01c/packages/core/src/browser/shell/theia-dock-panel.ts#L62-L69
   *
   * Reimplementing both's logic in these implementations
   */
  // this['_onCurrentChanged'] = (sender: TabBar<Widget>, args: TabBar.ICurrentChangedArgs<Widget>) => {
  //     this.markAsCurrent(args.currentTitle || undefined);
  //     super['_onCurrentChanged'](sender, args);
  // };
  _onCurrentChanged(sender: TabBar<Widget>, args: TabBar.ICurrentChangedArgs<Widget>): void {
    this.markAsCurrent(args.currentTitle || undefined);

    // NOTE: rest of logic from DockPanel
    // super['_onCurrentChanged'](sender, args);

    // Extract the previous and current title from the args.
    let { previousTitle, currentTitle } = args;

    // Hide the previous widget.
    if (previousTitle) {
      previousTitle.owner.hide();
    }

    // Show the current widget.
    if (currentTitle) {
      currentTitle.owner.show();
    }

    // Flush the message loop on IE and Edge to prevent flicker.
    // if (Platform.IS_EDGE || Platform.IS_IE) {
    //   MessageLoop.flush();
    // }

    // Schedule an emit of the layout modified signal.
    MessageLoop.postMessage(this, Private.LayoutModified);
  }
  // this['_onTabActivateRequested'] = (sender: TabBar<Widget>, args: TabBar.ITabActivateRequestedArgs<Widget>) => {
  //     this.markAsCurrent(args.title);
  //     super['_onTabActivateRequested'](sender, args);
  // };
  _onTabActivateRequested(sender: TabBar<Widget>, args: TabBar.ITabActivateRequestedArgs<Widget>): void {
    this.markAsCurrent(args.title);

    // NOTE: rest of logic from DockPanel
    // super['_onTabActivateRequested'](sender, args);
    args.title.owner.activate();
  }

  /**
   * Handle the `tabDetachRequested` signal from a tab bar.
   */
  private _onTabDetachRequested(sender: TabBar<Widget>, args: TabBar.ITabDetachRequestedArgs<Widget>): void {
    crdebug("PATCH DETACH! time to move, potentially,", this, sender, args);

    // Do nothing if a drag is already in progress.
    if (this._drag) {
      return;
    }

    // Release the tab bar's hold on the mouse.
    sender.releaseMouse();

    // Extract the data from the args.
    let { title, tab, clientX, clientY } = args;

    // Setup the mime data for the drag operation.
    let mimeData = new MimeData();
    let factory = () => title.owner;
    mimeData.setData('application/vnd.phosphor.widget-factory', factory);

    // Create the drag image for the drag operation.
    let dragImage = tab.cloneNode(true) as HTMLElement;

    // Create the drag object to manage the drag-drop operation.
    this._drag = new Drag({
      mimeData, dragImage,
      proposedAction: 'move',
      supportedActions: 'move',
    });

    // Hide the tab node in the original tab.
    // tab.classList.add('p-mod-hidden');

    // Create the cleanup callback.
    let cleanup = (() => {
      this._drag = null;
      tab.classList.remove('p-mod-hidden');
    });

    // Start the drag operation and cleanup when done.
    this._drag.start(clientX, clientY).then(cleanup);
  }

  /**
   * Show the overlay indicator at the given client position.
   *
   * Returns the drop zone at the specified client position.
   *
   * #### Notes
   * If the position is not over a valid zone, the overlay is hidden.
   */
  private _showOverlay(clientX: number, clientY: number): Private.DropZone {
    // Find the dock target for the given client position.
    let { zone, target } = Private.findDropTarget(
      this,
      clientX,
      clientY,
      this._edges
    );

    // crdebug("findin the drop target:", zone, target);

    // If the drop zone is invalid, hide the overlay and bail.
    if (zone === 'invalid') {
      this.overlay.hide(100);
      return zone;
    }

    // Setup the variables needed to compute the overlay geometry.
    let top: number;
    let left: number;
    let right: number;
    let bottom: number;
    let box = ElementExt.boxSizing(this.node); // TODO cache this?
    let rect = this.node.getBoundingClientRect();

    // Compute the overlay geometry based on the dock zone.
    switch (zone) {
    // case 'root-all':
    //   top = box.paddingTop;
    //   left = box.paddingLeft;
    //   right = box.paddingRight;
    //   bottom = box.paddingBottom;
    //   break;
    // case 'root-top':
    //   top = box.paddingTop;
    //   left = box.paddingLeft;
    //   right = box.paddingRight;
    //   bottom = rect.height * Private.GOLDEN_RATIO;
    //   break;
    // case 'root-left':
    //   top = box.paddingTop;
    //   left = box.paddingLeft;
    //   right = rect.width * Private.GOLDEN_RATIO;
    //   bottom = box.paddingBottom;
    //   break;
    // case 'root-right':
    //   top = box.paddingTop;
    //   left = rect.width * Private.GOLDEN_RATIO;
    //   right = box.paddingRight;
    //   bottom = box.paddingBottom;
    //   break;
    // case 'root-bottom':
    //   top = rect.height * Private.GOLDEN_RATIO;
    //   left = box.paddingLeft;
    //   right = box.paddingRight;
    //   bottom = box.paddingBottom;
    //   break;
    case 'widget-all':
      top = target!.top;
      left = target!.left;
      right = target!.right;
      bottom = target!.bottom;
      break;
    case 'widget-tab': // CR TODO: treating tabBar as top for now
    case 'widget-top':
      top = target!.top;
      left = target!.left;
      right = target!.right;
      bottom = target!.bottom + target!.height / 2;
      break;
    case 'widget-left':
      top = target!.top;
      left = target!.left;
      right = target!.right + target!.width / 2;
      bottom = target!.bottom;
      break;
    case 'widget-right':
      top = target!.top;
      left = target!.left + target!.width / 2;
      right = target!.right;
      bottom = target!.bottom;
      break;
    case 'widget-bottom':
      top = target!.top + target!.height / 2;
      left = target!.left;
      right = target!.right;
      bottom = target!.bottom;
      break;
    // case 'widget-tab':
    //   const tabHeight = target!.tabBar.node.getBoundingClientRect().height;
    //   top = target!.top;
    //   left = target!.left;
    //   right = target!.right;
    //   bottom = target!.bottom + target!.height - tabHeight;
    //   break;
    default:
      throw 'unreachable';
    }

    // Show the overlay with the computed geometry.
    this.overlay.show({
      top,
      bottom,
      // TODO is there a cleaner/proper way to do this adjustment?
      left: left + this.node.scrollLeft,
      right: right - this.node.scrollLeft,
    });

    // Finally, return the computed drop zone.
    return zone;
  }

  /**
   * Release the mouse grab & listeners.
   */
  private _releaseMouse(): void {
    // Bail early if no drag is in progress.
    if (!this._pressData) {
      return;
    }

    // Clear the override cursor.
    this._pressData.override.dispose();
    this._pressData = null;

    // Remove the extra document listeners.
    document.removeEventListener('keydown', this, true);
    document.removeEventListener('mouseup', this, true);
    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('contextmenu', this, true);
  }

  cr_init(options: CodeRibbonTheiaRibbonPanel.IInitOptions) {
    crdebug("Ribbon: cr_init", options);

    // this._shell = options.shell;

    let update_active_strip = () => {
      this._strips.map((strip) => {
        strip.node.classList.remove("cr-current");
      });
      if (this.mru_strip) this.mru_strip.node.classList.add("cr-current");
    };
    update_active_strip();
    this.tracker.currentChanged.connect(update_active_strip);
  }

  override dispose(): void {
    this._releaseMouse();
    this.overlay.hide(0);
    if (this._drag) {
      this._drag.dispose();
    }

    super.dispose();
  }

  /**
   * This function puts a Widget somewhere along the Ribbon
   * @param widget   something that will end up in a patch
   * @param options  how to decide where to place the thing
   */
  override addWidget(widget: Widget, options?: RibbonPanel.IAddOptions): void {
    crdebug("RibbonPanel addWidget:", widget, options);

    this.autoAdjustRibbonTailLength();

    let relative_patch = options?.ref ? this.whichPatchHasWidget(options?.ref) : this.mru_strip?.mru_patch || this._strips[0];
    let strip = (relative_patch!.parent as CodeRibbonTheiaRibbonStrip);

    switch (options?.mode) {
      // operations within the existing/same strip:
      case "split-top":
      case "split-bottom":
      case "split-up":
      case "split-down":
        if (!relative_patch) {
          this.messageService?.error("CodeRibbon: I don't know where to put that on the Ribbon!");
          throw "no relative patch survived when adding a widget";
        }
        strip = (relative_patch.parent as CodeRibbonTheiaRibbonStrip);
        strip.addWidget(widget, {
          ref: relative_patch,
          mode: options.mode,
        })
        break;
      // TODO cases for left/right strips
      // TODO cases for on-screen strips only
      case "ribbon-tail":
      default:
        strip = this._rightmost_contentful_strip || strip;
        if (!strip) strip = this._strips[0];
        if (!strip.has_empty_patch()) {
          strip = this.get_sibling(strip, "right") || strip;
        }
        strip!.addWidget(widget);
        break;
    }

    // super.addWidget(widget);
    this.widgetAdded.emit(widget);
    crdebug("RibbonPanel Added widget", widget);

    this.autoAdjustRibbonTailLength();
  }

  // TODO is this actually an override?
  activateWidget(widget: Widget): void {
    // TODO focus the widget, scrolling, etc...
    crdebug("RibbonPanel activateWidget", widget);
    // super.activate();
    // column's activate first:
    let strip: CodeRibbonTheiaRibbonStrip | null = null;
    if (widget instanceof CodeRibbonTheiaPatch) {
      if (!(widget.parent instanceof CodeRibbonTheiaRibbonStrip)) {
        crdebug("patch not parented by strip:", widget);
        throw Error("Patch not parented by Strip");
      }
      strip = widget.parent;
      if (!strip) throw Error("strip not found as parent of patch");
      this.scrollStripIntoView(strip as CodeRibbonTheiaRibbonStrip)
        .then(() => {
          // widget.activate();
          strip!.activateWidget(widget);
          this.widgetActivated.emit(widget);
        })
        .catch((e) => {
          crdebug("scrollStripIntoView fail reason:", e);
          throw Error("Failed to scrollStripIntoView");
        });
    } else if (widget instanceof CodeRibbonTheiaRibbonStrip) {
      strip = widget;
      this.scrollStripIntoView(widget)
        .then(() => {
          widget.activate();
          this.widgetActivated.emit(widget);
        })
        .catch((e) => {
          crdebug("scrollStripIntoView fail reason:", e);
          throw Error("Failed to scrollStripIntoView");
        });
    } else {
      let w_parent = widget.parent;
      while (w_parent!.parent!) {
        if (w_parent instanceof CodeRibbonTheiaPatch) {
          strip = w_parent.parent as CodeRibbonTheiaRibbonStrip;
          if (!(strip instanceof CodeRibbonTheiaRibbonStrip)) {
            crdebug("patch without strip as parent:", w_parent);
            throw Error("Patch not parented by Strip");
          }
          this.scrollStripIntoView(strip as CodeRibbonTheiaRibbonStrip)
            .then(() => {
              // widget.activate();
              strip!.activateWidget(widget);
              this.widgetActivated.emit(widget);
            })
            .catch((e) => {
              crdebug("scrollStripIntoView failure:", e);
              throw Error("Failed to scrollStripIntoView");
            });
          break;
        }
        w_parent = w_parent!.parent;
      }
      if (!w_parent!.parent) {
        widget.activate();
        this.widgetActivated.emit(widget);
        crdebug("error on widget:", widget);
        throw Error(
          "not sure how to activate widget outside known Ribbon component",
        );
      }
    }

    // mark that strip as most recently used:
    // this._mru_strip = strip;
  }

  createNewRibbonStrip(
    args: CodeRibbonTheiaRibbonPanel.ICreateNewRibbonStripOptions = {},
  ) {
    crdebug("RibbonPanel createNewRibbonStrip:", args);
    if (this._freeze_ribbon) {
      crdebug("WARN: createNewRibbonStrip while the ribbon is frozen.");
    }
    let { index, options, add_options, init_options } = args;
    let new_strip;
    new_strip = new CodeRibbonTheiaRibbonStrip({
      ...options,
      renderer: this._renderer,
    });
    if (index === undefined) {
      // append to ribbon
      super.addWidget(new_strip);
      // crdebug("New strip created, init...");
    } else {
      super.insertWidget(index, new_strip);
    }
    new_strip.cr_init(init_options);

    this.tracker.add(new_strip);
    return new_strip;
  }

  autoAdjustRibbonTailLength() {
    crdebug("RibbonPanel autoAdjustRibbonTailLength");

    if (this._freeze_ribbon) {
      crdebug("Skip tail adjustment due to ribbon freeze.");
      return;
    }

    if (this._strips.length < 1) {
      // create first RibbonStrip
      crdebug("Creating first Strip in Ribbon...");
      let new_strip = this.createNewRibbonStrip();
    }

    let hpps = (this.layout as CodeRibbonTheiaRibbonLayout).hpps;
    let strips = this._strips;
    let rightmost_strip = strips[strips.length - 1];
    let rightmost_contentful_strip = this._rightmost_contentful_strip;

    if (rightmost_strip.contentful_size) {
      let new_strip = this.createNewRibbonStrip();
    }

    if (rightmost_contentful_strip) {
      let end_idx = strips.indexOf(rightmost_strip);
      let tail_idx = strips.indexOf(rightmost_contentful_strip);

      if (end_idx - tail_idx >= hpps) {
        if (rightmost_strip.contentful_size != 0)
          throw Error("tried to trim off strip with content");
        rightmost_strip.dispose();
      }

      // let count_to_remove = strips.indexOf(rightmost_strip) - strips.indexOf(rightmost_contentful_strip) - 1;
      // crdebug(`trimming ${count_to_remove} excess empty strips from end of ribbon...`);
    }

    if (strips.length < hpps) {
      // ensure at least one screen of initial patches
      let toAdd =
        (this.layout as CodeRibbonTheiaRibbonLayout).hpps - strips.length;
      let new_strips = Array(toAdd)
        .fill(0)
        .map((_n) => {
          this.createNewRibbonStrip();
        });
    }
  }

  protected get _rightmost_contentful_strip():
    | CodeRibbonTheiaRibbonStrip
    | undefined {
    if (this._strips.length == 0) return undefined;

    let strip = undefined;
    for (let i = this._strips.length - 1; i >= 0; i--) {
      strip = this._strips[i];
      if (strip.contentful_size) {
        break;
      }
    }

    return strip;
  }

  set scrollLeft(value: number) {
    // TODO
  }
  get scrollLeft(): number {
    return this.node?.scrollLeft;
  }

  get_sibling(ref: CodeRibbonTheiaRibbonStrip, side: string) {
    const ref_idx = this._strips.indexOf(ref);
    if (ref_idx == -1) {
      crdebug("get_sibling: ref passed not in strips?", ref);
      return undefined;
    }

    switch (side) {
      case "before":
      case "left":
        if (ref_idx <= 0) {
          return undefined;
        }
        return this._strips[ref_idx - 1];
      case "after":
      case "right":
        if (ref_idx + 1 >= this._strips.length) {
          return undefined;
        }
        return this._strips[ref_idx + 1];
      default:
        throw new Error("get_sibling invalid side:" + side);
    }
  }

  get _strips(): readonly CodeRibbonTheiaRibbonStrip[] {
    return (this.layout as CodeRibbonTheiaRibbonLayout)
      .widgets as readonly CodeRibbonTheiaRibbonStrip[];
  }

  get contentful_widgets(): readonly Widget[] {
    // TODO TypeScript can't understand flat() operation???
    return this._strips
      .map((strip: CodeRibbonTheiaRibbonStrip) => {
        return strip.contentful_widgets;
      })
      .flat()
      .filter(Boolean) as readonly Widget[];
  }

  whichPatchHasWidget(widget: Widget): CodeRibbonTheiaPatch | null {
    if (!this.contains(widget)) return null;

    while (!(widget instanceof CodeRibbonTheiaPatch)) {
      if (widget.parent == null) return null;
      widget = widget.parent;
    }
    return widget;
  }

  scrollStripIntoView(
    strip: CodeRibbonTheiaRibbonStrip,
    {
      skip_visible_check = false,
      wait_for_transition = false,
      scroll_behavior = "smooth",
    }: {
      skip_visible_check?: boolean;
      wait_for_transition?: boolean;
      scroll_behavior?: ScrollBehavior;
    } = {},
  ): Promise<boolean> {
    const scrollFinish = new Promise<boolean>((resolve, reject) => {
      let startScrollTo = () => {
        if (!skip_visible_check) {
          // TODO check if a strip is already on-screen
        }

        var timeoutHandle: number | undefined = undefined;
        let cur_scroll = this.scrollLeft;
        let scrollDiff = 0;

        let container_bounds = this.node.getBoundingClientRect();
        let strip_bounds = strip.node.getBoundingClientRect();

        if (strip_bounds.right > container_bounds.right) {
          scrollDiff = strip_bounds.right - container_bounds.right;
        } else if (strip_bounds.left < container_bounds.left) {
          scrollDiff = strip_bounds.left - container_bounds.left;
        }

        const target_scroll = cur_scroll + scrollDiff;
        const fixed_scroll = Number(target_scroll.toFixed());

        crdebug("Scrolling", scrollDiff, "to get", strip, "into view...");
        this.node.classList.add("cr-managed-scroll-active");

        const stopScrollCallback = () => {
          cur_scroll = this.scrollLeft;
          cur_scroll = Number(cur_scroll.toFixed());
          let did_achieve = true;
          if (cur_scroll != fixed_scroll && cur_scroll + 1 != fixed_scroll) {
            did_achieve = false;
          }
          this.node.classList.remove("cr-managed-scroll-active");

          if (did_achieve) {
            resolve(did_achieve);
          } else {
            // TODO check if strip is on screen, if not, reject
            reject("failed to achieve target scroll");
          }
        };

        const checkScroll = () => {
          if (Number(this.scrollLeft.toFixed()) == fixed_scroll) {
            this.node.removeEventListener("scroll", checkScroll);
            stopScrollCallback();
          } else {
            window.clearTimeout(timeoutHandle);
            timeoutHandle = window.setTimeout(() => {
              this.node.removeEventListener("scroll", checkScroll);
              stopScrollCallback();
            }, 210); // ms timeout
          }
        };

        this.node.addEventListener("scroll", checkScroll);
        checkScroll();
        setTimeout(() => {
          this.node.scrollTo({
            left: target_scroll,
            behavior: scroll_behavior,
          });
        });
      };

      if (wait_for_transition) {
        let evt_handler = (e: TransitionEvent) => {
          setTimeout(() => {
            startScrollTo();
          }, 1);
          strip.node.removeEventListener("transitionend", evt_handler);
        };
        strip.node.addEventListener("transitionend", evt_handler);
      } else {
        startScrollTo();
      }
    });

    return scrollFinish;
  }

  get mru_strip(): CodeRibbonTheiaRibbonStrip | null {
    return this.tracker.currentWidget;
  }

  // NOTE === phosphor DockPanel API compatility section === NOTE //
  // we might want to split this into a `ImprovedBoxPanel` class instead?
  // this section is because phosphor's BoxPanel has only a tiny fraction of the
  // features that DockPanel has, and they're expected by Theia

  // @ts-expect-error TS2425: Class defines instance member property 'widgets', but extended class defines it as instance member function.
  override widgets(): IIterator<Widget> {
    // TODO iterate widgets in order of ribbon layout from within strips
    // return (this.layout as CodeRibbonTheiaRibbonLayout).widgets;
    return iter(this.contentful_widgets);
  }

  tabBars(): IIterator<TabBar<Widget>> {
    // TODO removal of tabBars
    // return this._root ? this._root.iterTabBars() : empty<TabBar<Widget>>();
    return empty<TabBar<Widget>>();
  }

  /**
   * A replacement for what would normally be handled in the layout's
   * hitTestTabAreas & hitTestTabNodes (originally in DockLayout)
   *
   * It is better here because we can more efficiently search through the strips
   * and we don't need to reference patch instances from the RibbonLayout
   *
   * @param  clientX               [description]
   * @param  clientY               [description]
   * @return DockPanel.ITabAreaGeometry which contains coords and the tabBar
   */
  locatePatchAtPosition(clientX: number, clientY: number): CodeRibbonTheiaPatch | null {
    // TODO we can get better performance here with a binary or tree search:
    // we know the strips are in sequential order
    // probably not important until people get HUGE ribbons though
    const strip = this._strips.find((strip) => {
      return ElementExt.hitTest(strip.node, clientX, clientY);
    });
    if (!strip) {
      return null;
    }
    const patch = strip._patches.find((patch) => {
      return ElementExt.hitTest(patch.node, clientX, clientY);
    });
    if (!patch) {
      crdebug("WARN: This is weird, we hit a strip but not a patch???", this, strip);
      return null;
    }
    return patch;
  }

  /**
   * Find the tab area which contains the given client position.
   *
   * @param clientX - The client X position of interest.
   *
   * @param clientY - The client Y position of interest.
   *
   * @returns The geometry of the tab area at the given position, or
   *   `null` if there is no tab area at the given position.
   */
  hitTestTabAreas(clientX: number, clientY: number): DockLayout.ITabAreaGeometry | null {
    // Bail early if hit testing cannot produce valid results.
    // if (!this._root || !this.parent || !this.parent.isVisible) {
    if (!this.layout || !this.isVisible) {
      crdebug("hitTestTabAreas ERR: fast-fail did fail!", this);
      return null;
    }

    const layout = (this.layout as CodeRibbonTheiaRibbonLayout);

    // Ensure the parent box sizing data is computed.
    // @ts-expect-error TS2341: Property '_box' is private
    if (!layout._box) {
      // @ts-expect-error TS2341: Property '_box' is private
      layout._box = ElementExt.boxSizing(this.node);
    }

    // Convert from client to local coordinates.
    let rect = this.node.getBoundingClientRect();
    // @ts-expect-error TS2341: Property '_box' is private
    let x = clientX - rect.left - layout._box.borderLeft;
    // @ts-expect-error TS2341: Property '_box' is private
    let y = clientY - rect.top - layout._box.borderTop;

    // Find the tab layout node at the local position.
    // let tabNode = this._root.hitTestTabNodes(x, y);
    // let tabNode = this.hitTestTabNodes(x, y);
    /**
     * CR: this replacement
     */
    // let target = panel.locatePatchGeometry(clientX, clientY);
    let _patch = this.locatePatchAtPosition(clientX, clientY);
    // crdebug("hitTestTabAreas: patch at position is", clientX, clientY, _patch);
    if (!_patch) {
      return null;
    }
    let patch_rect = _patch.node.getBoundingClientRect();
    let tabNode = {
      tabBar: _patch.tabBar,
      top: patch_rect.top - rect.top,
      left: patch_rect.left - rect.left,
      width: _patch.node.clientWidth,
      height: _patch.node.clientHeight
    }
    // CR: end replacement

    // Bail if a tab layout node was not found.
    if (!tabNode) {
      return null;
    }

    // Extract the data from the tab node.
    let { tabBar, top, left, width, height } = tabNode;

    // Compute the right and bottom edges of the tab area.
    // @ts-expect-error TS2341: Property '_box' is private
    let borderWidth = layout._box.borderLeft + layout._box.borderRight;
    // @ts-expect-error TS2341: Property '_box' is private
    let borderHeight = layout._box.borderTop + layout._box.borderBottom;
    let right = rect.width - borderWidth - (left + width);
    let bottom = rect.height - borderHeight - (top + height);

    // Return the hit test results.
    return { tabBar, x, y, top, left, right, bottom, width, height };
  }

  // TODO signal connections from columns
  private _layoutModified = new Signal<this, void>(this);
  get layoutModified() {
    return this._layoutModified;
  }

  // overriding BoxPanel's p-BoxPanel-child
  override onChildAdded(msg: Widget.ChildMessage) {
    msg.child.addClass("cr-RibbonPanel-child");

    if (msg.child instanceof CodeRibbonTheiaRibbonStrip) {
      msg.child.patchAdded.connect(this._onPatchAdded, this);
    }
  }
  // NOTE redefined later
  // override onChildRemoved(msg) {}

  private _onPatchAdded(sender: CodeRibbonTheiaRibbonStrip, patch: CodeRibbonTheiaPatch) {
    crdebug("Ribbon: connecting with new patch", patch);
    patch.tabBar.tabDetachRequested.connect(this._onTabDetachRequested, this);
  }

  /**
   * Save current layout of the ribbon
   * @return new config object for current layout state
   *
   * use the returned object as input to restoreLayout later
   */
  saveLayout(): CodeRibbonTheiaRibbonPanel.ILayoutConfig {
    crdebug("RibbonPanel saveLayout");
    let active_strip = this.mru_strip;
    if (!(active_strip instanceof CodeRibbonTheiaRibbonStrip))
      active_strip = this._strips[0];
    return {
      main: {
        type: "ribbon-area",
        overview_active: false, // TODO
        focus_active: false, // TODO
        active_strip: this._strips.indexOf(active_strip),
        strip_configs: this._strips.map((strip) => strip.saveLayout()),
      },
    };
  }

  /**
   * Here to mimick phosphor restoration
   * https://github.com/phosphorjs/phosphor/blob/8fee9108/packages/widgets/src/docklayout.ts#L265
   *
   * @param  config The layout configuration to restore
   */
  restoreLayout(config: CodeRibbonTheiaRibbonPanel.ILayoutConfig): void {
    crdebug("RibbonPanel restoreLayout:", config);
    // TODO rest of these props
    if (config.main == null) throw Error("Can't restoreLayout with no data");
    const { type, overview_active, focus_active, active_strip, strip_configs } =
      config.main;
    if (type != "ribbon-area") {
      crdebug("RibbonPanel type mismatch in restored config!");
      throw Error(
        `RibbonPanel does not support restoreLayout config type ${type}`,
      );
    }

    // TODO can we check to make sure we aren't overwriting a current, contentful layout?
    // also, should we?
    if (strip_configs) {
      this._freeze_ribbon = true;
      // NOTE: we *cannot* use map here since we're changing the array
      let prior_strip_count = this._strips.length;
      for (let i = 0; i < prior_strip_count; i++) {
        this._strips[0].dispose();
      }
      strip_configs.map((strip_config) => {
        let new_strip = this.createNewRibbonStrip({
          init_options: {
            config: strip_config,
          },
        });
      });
      this._freeze_ribbon = false;
    }

    // if (active_strip >= 0) {
    //   this._mru_strip = this._strips[active_strip];
    //   // TODO focus the last strip by active_strip
    // }
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
      this.toDisposeOnMarkAsCurrent.push(
        Disposable.create(() => title.owner.disposed.disconnect(resetCurrent)),
      );
    }
  }

  protected maximizedElement: HTMLElement | undefined;
  protected getMaximizedElement(): HTMLElement {
    if (!this.maximizedElement) {
      this.maximizedElement = document.createElement("div");
      this.maximizedElement.style.display = "none";
      document.body.appendChild(this.maximizedElement);
    }
    return this.maximizedElement;
  }

  protected handleMenuBarVisibility(newValue: string): void {
    const areaContainer = this.node.parentElement;
    const maximizedElement = this.getMaximizedElement();

    if (areaContainer === maximizedElement) {
      if (newValue === "visible") {
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
      (bar) => ArrayExt.firstIndexOf(bar.titles, title) > -1,
    );
  }

  protected override onChildRemoved(msg: Widget.ChildMessage): void {
    super.onChildRemoved(msg);
    msg.child.removeClass("cr-RibbonPanel-child");
    this.widgetRemoved.emit(msg.child);

    this.autoAdjustRibbonTailLength();
  }

  // TODO tab bar removal?
  /**
   * IDEA: swap TabBar for a column or strip method API?
   * @param  widget               [description]
   * @return        [description]
   */
  nextTabBarWidget(widget: Widget): Widget | undefined {
    const current = this.findTabBar(widget.title);
    const next = current && this.nextTabBarInPanel(current);
    return (next && next.currentTitle && next.currentTitle.owner) || undefined;
  }

  // TODO tab bar removal
  nextTabBarInPanel(tabBar: TabBar<Widget>): TabBar<Widget> | undefined {
    const tabBars = toArray(this.tabBars());
    const index = tabBars.indexOf(tabBar);
    if (index !== -1) {
      return tabBars[index + 1];
    }
    return undefined;
  }

  previousTabBarWidget(widget: Widget): Widget | undefined {
    const current = this.findTabBar(widget.title);
    const previous = current && this.previousTabBarInPanel(current);
    return (
      (previous && previous.currentTitle && previous.currentTitle.owner) ||
      undefined
    );
  }

  previousTabBarInPanel(tabBar: TabBar<Widget>): TabBar<Widget> | undefined {
    const tabBars = toArray(this.tabBars());
    const index = tabBars.indexOf(tabBar);
    if (index !== -1) {
      return tabBars[index - 1];
    }
    return undefined;
  }

  /**
   * required (called by) the shell layout restorer,
   * https://github.com/eclipse-theia/theia/blob/v1.29.0/packages/core/src/browser/shell/application-shell.ts#L719
   * notice it does not actually give us any new information,
   * so we can leave this method as a stub for good
   *
   * also the point of CR is we don't use tabs...
   *
   * @param title dummy method, not used
   */
  markActiveTabBar(title?: Title<Widget>): void {
    crdebug("RibbonPanel: markActiveTabBar", title);
  }

  get mode(): RibbonPanel.Mode {
    return this._mode;
  }

  protected readonly toDisposeOnToggleMaximized = new DisposableCollection();
  toggleMaximized(): void {
    // TODO ribbon elements stacking order:
    const areaContainer = this.node.parentElement;
    if (!areaContainer) {
      return;
    }
    const maximizedElement = this.getMaximizedElement();
    if (areaContainer === maximizedElement) {
      this.toDisposeOnToggleMaximized.dispose();
      return;
    }
    if (this.isAttached) {
      // TODO what is this really doing???
      UnsafeWidgetUtilities.detach(this);
    }
    maximizedElement.style.display = "block";
    this.addClass(MAXIMIZED_CLASS);
    const preference = this.preferences?.get("window.menuBarVisibility");
    if (!this.isElectron() && preference === "visible") {
      this.addClass(VISIBLE_MENU_MAXIMIZED_CLASS);
    }
    UnsafeWidgetUtilities.attach(this, maximizedElement);
    this.fit();
    this.onDidToggleMaximizedEmitter.fire(this);
    this.toDisposeOnToggleMaximized.push(
      Disposable.create(() => {
        maximizedElement.style.display = "none";
        this.removeClass(MAXIMIZED_CLASS);
        this.onDidToggleMaximizedEmitter.fire(this);
        if (!this.isElectron()) {
          this.removeClass(VISIBLE_MENU_MAXIMIZED_CLASS);
        }
        if (this.isAttached) {
          UnsafeWidgetUtilities.detach(this);
        }
        UnsafeWidgetUtilities.attach(this, areaContainer);
        this.fit();
      }),
    );

    // TODO NOTE mod to BoxLayout?
    const layout = this.layout;
    if (
      layout instanceof DockLayout ||
      layout instanceof BoxLayout ||
      layout instanceof CodeRibbonTheiaRibbonLayout
    ) {
      crdebug("in toggleMaximized, layout is", layout);

      // NOTE temporary store
      // @ts-expect-error TS7053: Element implicitly has an 'any' type
      const onResize: any = layout["onResize"];
      // @ts-expect-error TS7053: Element implicitly has an 'any' type
      layout["onResize"] = () =>
        onResize.bind(layout)(Widget.ResizeMessage.UnknownSize);
      this.toDisposeOnToggleMaximized.push(
        // @ts-expect-error TS7053: Element implicitly has an 'any' type
        Disposable.create(() => (layout["onResize"] = onResize)),
      );
    }

    const removedListener = () => {
      if (!this.widgets().next()) {
        this.toDisposeOnToggleMaximized.dispose();
      }
    };
    this.widgetRemoved.connect(removedListener);
    this.toDisposeOnToggleMaximized.push(
      Disposable.create(() => this.widgetRemoved.disconnect(removedListener)),
    );
  }
}

export namespace CodeRibbonTheiaRibbonPanel {
  export interface IInitOptions {
    // shell: ApplicationShell ;
  }

  export interface IRibbonLayoutConfig {
    type: "ribbon-area"; // compatibility for dock*
    overview_active: boolean; // TODO: overview
    focus_active: boolean; // if strip is focused
    active_strip: number; // which strip is active
    strip_configs: CodeRibbonTheiaRibbonStrip.ILayoutConfig[];
  }

  // this needs to have `main` due to it's use in a few places:
  // https://github.com/eclipse-theia/theia/blob/v1.29.0/packages/core/src/browser/shell/application-shell.ts#L715
  export interface ILayoutConfig {
    main: IRibbonLayoutConfig | null;
  }

  export interface ICreateNewRibbonStripOptions {
    index?: number;
    options?: CodeRibbonTheiaRibbonStrip.IOptions;
    add_options?: RibbonStrip.IAddOptions;
    init_options?: CodeRibbonTheiaRibbonStrip.IInitOptions;
  }

  /**
   * The sizes of the edge drop zones, in pixels.
   */
  export interface IEdges {
     // * The size of the top edge drop zone.
    top: number;

     // * The size of the right edge drop zone.
    right: number;

     // * The size of the bottom edge drop zone.
    bottom: number;

     // * The size of the left edge drop zone.
    left: number;
  };
}

namespace Private {
  export function createLayout(
    options: RibbonPanel.IOptions,
  ): CodeRibbonTheiaRibbonLayout {
    return options.layout || new CodeRibbonTheiaRibbonLayout(options);
  }

  /**
   * Copy from phosphor DockPanel:
   * A singleton `'layout-modified'` conflatable message.
   */
  export
  const LayoutModified = new ConflatableMessage('layout-modified');

  export interface IPressData {
    // * The handle which was pressed.
    handle: HTMLDivElement;

    // * The offset of the press in handle coordinates.
    deltaX: number;
    deltaY: number;

    // clears override cursor
    override: IDisposable;
  }

  /**
   * A type alias for a drop zone.
   */
  export
  type DropZone = (
    // * An invalid drop zone.
    'invalid' |

    // // * The entirety of the root dock area.
    // 'root-all' |
    //
    // // * The top portion of the root dock area.
    // 'root-top' |
    //
    // // * The left portion of the root dock area.
    // 'root-left' |
    //
    // // * The right portion of the root dock area.
    // 'root-right' |
    //
    // // * The bottom portion of the root dock area.
    // 'root-bottom' |

    // * The entirety of a tabbed widget area.
    'widget-all' |

    // * The top portion of tabbed widget area.
    'widget-top' |

    // * The left portion of tabbed widget area.
    'widget-left' |

    // * The right portion of tabbed widget area.
    'widget-right' |

    // * The bottom portion of tabbed widget area.
    'widget-bottom' |

    // * The the bar of a tabbed widget area.
    'widget-tab'
  );

  /**
   * An object which holds the drop target zone and widget.
   */
  export interface IDropTarget {
    // * The semantic zone for the mouse position.
    zone: DropZone;
    // * The tab area geometry for the drop zone, or `null`.
    target: DockLayout.ITabAreaGeometry | null;
  }

  /**
   * Find the drop target at the given client position.
   */
  export
  function findDropTarget(
    panel: CodeRibbonTheiaRibbonPanel, // panel: DockPanel,
    clientX: number,
    clientY: number,
    edges: CodeRibbonTheiaRibbonPanel.IEdges
  ): IDropTarget {
    // Bail if the mouse is not over the dock panel.
    if (!ElementExt.hitTest(panel.node, clientX, clientY)) {
      crdebug("findDropTarget", "failed panel hitTest");
      return { zone: 'invalid', target: null };
    }

    // Look up the layout for the panel.
    let layout = panel.layout as CodeRibbonTheiaRibbonLayout;

    // // If the layout is empty, indicate the entire root drop zone.
    // if (layout.isEmpty) {
    //   return { zone: 'root-all', target: null };
    // }

    // CR TODO fix this when single-document mode supported
    // Test the edge zones when in multiple document mode.
    if (panel.mode === 'multiple-document') {
    // if (true) {
      // Get the client rect for the dock panel.
      let panelRect = panel.node.getBoundingClientRect();

      // Compute the distance to each edge of the panel.
      let pl = clientX - panelRect.left + 1;
      let pt = clientY - panelRect.top + 1;
      let pr = panelRect.right - clientX;
      let pb = panelRect.bottom - clientY;

      // Find the minimum distance to an edge.
      let pd = Math.min(pt, pr, pb, pl);

      // Return a root zone if the mouse is within an edge.
      switch (pd) {
        case pt:
         /**
         * CR TODO: what should happen when a user intends to move something above the entire ribbon?
         * maybe something magical like a "stash" of patches that aren't active?
         * imagining "put a few patches in your pocket, walk along the ribbon, pull them all out there"
         */
          // if (pt < edges.top) {
          //   return { zone: 'root-top', target: null };
          // }
          break;
        case pr:
          // CR: not supporting moving a patch's content into the right dock
          // if (pr < edges.right) {
          //   return { zone: 'root-right', target: null };
          // }
          break;
        case pb:
          // CR TODO: support dragging patches into bottom dock
          // if (pb < edges.bottom) {
          //   return { zone: 'root-bottom', target: null };
          // }
          break;
        case pl:
          // CR: not supporting moving a patch's content into the left dock
          // if (pl < edges.left) {
          //   return { zone: 'root-left', target: null };
          // }
          break;
        default:
          throw 'unreachable';
      }
    }

    // Hit test the dock layout at the given client position.
    // let target = layout.hitTestTabAreas(clientX, clientY);
    let target = panel.hitTestTabAreas(clientX, clientY);

    // crdebug("hitTestTabAreas gave us", target);

    // Bail if no target area was found.
    if (!target) {
      return { zone: 'invalid', target: null };
    }

    // CR TODO
    // Return the whole tab area when in single document mode.
    if (panel.mode === 'single-document') {
      return { zone: 'widget-all', target };
    }

    // Compute the distance to each edge of the tab area.
    let al = target.x - target.left + 1;
    let at = target.y - target.top + 1;
    let ar = target.left + target.width - target.x;
    let ab = target.top + target.height - target.y;

    // CR TODO: ignoring/working around the tab bar as a drop zone
    const tabHeight = target.tabBar.node.getBoundingClientRect().height;
    if (at < tabHeight) {
      return { zone: 'widget-tab', target };
    }

    // Get the X and Y edge sizes for the area.
    let rx = Math.round(target.width / 3);
    let ry = Math.round(target.height / 3);

    // If the mouse is not within an edge, indicate the entire area.
    if (al > rx && ar > rx && at > ry && ab > ry) {
      return { zone: 'widget-all', target };
    }

    // Scale the distances by the slenderness ratio.
    al /= rx;
    at /= ry;
    ar /= rx;
    ab /= ry;

    // Find the minimum distance to the area edge.
    let ad = Math.min(al, at, ar, ab);

    // Find the widget zone for the area edge.
    let zone: DropZone;
    switch (ad) {
    case al:
      zone = 'widget-left';
      break;
    case at:
      zone = 'widget-top';
      break;
    case ar:
      zone = 'widget-right';
      break;
    case ab:
      zone = 'widget-bottom';
      break;
    default:
      throw 'unreachable';
    }

    // Return the final drop target.
    return { zone, target };
  }

  /**
   * Get the drop reference widget for a tab bar.
   */
  export function getDropRef(tabBar: TabBar<Widget>): Widget | null {
    // if (tabBar.titles.length === 0) {
    //   return null;
    // }
    if (tabBar.currentTitle) {
      return tabBar.currentTitle.owner;
    }
    if (tabBar.titles.length > 0) {
      return tabBar.titles[tabBar.titles.length - 1].owner;
    }
    if (tabBar.parent instanceof CodeRibbonTheiaPatch) {
      return tabBar.parent;
    }
    return null;
  }
}
