/** @format */

import * as React from "react";
import {
  injectable,
  postConstruct,
  inject,
} from "@theia/core/shared/inversify";
import { AlertMessage } from "@theia/core/lib/browser/widgets/alert-message";
import { ReactWidget } from "@theia/core/lib/browser/widgets/react-widget";
import { MessageService } from "@theia/core";
import { Message, QuickInputService, InputBox } from "@theia/core/lib/browser";
import { AbstractViewContribution } from "@theia/core/lib/browser";
import { Command, CommandRegistry } from "@theia/core/lib/common/command";
import { crdebug } from "./cr-logger";

import { QuickFileSelectService } from "@theia/file-search/lib/browser/quick-file-select-service";
import { MonacoQuickInputService } from "@theia/monaco/lib/browser/monaco-quick-input-service";
import { EmbeddableMonacoQuickInputService } from "./embeddable-mqis";

/**
 * since this is registered in theia's WidgetManager / WidgetFactory it is part of the inversify container (hence injectable)
 */
@injectable()
export class CodeRibbonFuzzyFileOpenerWidget extends ReactWidget {
  static readonly ID = "coderibbon:fuzzy-file-opener";
  static readonly LABEL = "CodeRibbon Fuzzy File Finder";

  // protected current_search?: string = undefined;
  // TODO this should be the monaco input / quick open equivalent
  // protected inputElement?: HTMLInputElement;
  protected inputElementRef: React.RefObject<HTMLInputElement>;
  // private inputBox: InputBox;
  private tmp_input: any;

  @inject(QuickInputService)
  protected readonly quickInputService: QuickInputService;

  @inject(QuickFileSelectService)
  protected readonly quickFileSelectService: QuickFileSelectService;

  @inject(MonacoQuickInputService)
  protected readonly monacoQuickInputService: MonacoQuickInputService;

  // @inject(EmbeddableMonacoQuickInputService)
  // protected readonly embeddableMQIS: EmbeddableMonacoQuickInputService;

  @inject(MessageService)
  protected readonly messageService!: MessageService;

  @postConstruct()
  protected init(): void {
    crdebug("CRFFO postConstruct");
    this.id = CodeRibbonFuzzyFileOpenerWidget.ID;
    this.title.label = CodeRibbonFuzzyFileOpenerWidget.LABEL;
    this.title.caption = CodeRibbonFuzzyFileOpenerWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = "fa fa-window-maximize"; // example widget icon.

    this.inputElementRef = React.createRef();
    // TODO how?
    // this.inputBox = this.quickInputService.createInputBox();
    // this.tmp_input = this.embeddableMQIS.createQuickPick();
    
    this.update();
  }

  activate(): void {
    this.inputElementRef.current?.focus();
  }

  render(): React.ReactElement {
    const header = `Does not work yet. Eventually this should be the same UI as Ctrl-P.`;
    const show_fuzzy_search: boolean = true;
    return (
      <div id="widget-container">
        <AlertMessage type="INFO" header={header} />
        {/* <button
          className="theia-button secondary"
          title="Display Message"
          onClick={(_a) => this.displayMessage()}
        >
          Display Message
        </button> */}
        <input
          ref={this.inputElementRef}
          name="search"
          placeholder="search project files..."
          autoComplete="off"
        />
        {/* {this.tmp_input} */}
      </div>
    );
  }

  protected displayMessage(): void {
    this.messageService.info(
      "Congratulations: My Widget Successfully Created!",
    );
  }
}

export const TestOpenFFOCommand: Command = { id: "coderibbon:test-ffo" };

@injectable()
export class CodeRibbonFuzzyFileOpenerContribution extends AbstractViewContribution<CodeRibbonFuzzyFileOpenerWidget> {
  constructor() {
    super({
      widgetId: CodeRibbonFuzzyFileOpenerWidget.ID,
      widgetName: CodeRibbonFuzzyFileOpenerWidget.LABEL,
      defaultWidgetOptions: { area: "main" },
      toggleCommandId: TestOpenFFOCommand.id,
    });
  }

  registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(TestOpenFFOCommand, {
      execute: () => {
        crdebug("command: TestOpenFFOCommand executes");
        super.openView({ activate: false, reveal: true });
      },
    });
  }

  // registerMenus(menus:)
}
