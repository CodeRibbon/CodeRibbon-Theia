import * as React from 'react';
import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import { AlertMessage } from '@theia/core/lib/browser/widgets/alert-message';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { MessageService } from '@theia/core';
import { Message } from '@theia/core/lib/browser';
import { AbstractViewContribution } from '@theia/core/lib/browser';
import { Command, CommandRegistry } from '@theia/core/lib/common/command';

@injectable()
export class CodeRibbonFuzzyFileOpenerWidget extends ReactWidget {
  static readonly ID = "coderibbon:fuzzy-file-opener";
  static readonly LABEL = "CodeRibbon Fuzzy File Finder";

  @postConstruct()
  protected init(): void {
    this.id = CodeRibbonFuzzyFileOpenerWidget.ID;
    this.title.label = CodeRibbonFuzzyFileOpenerWidget.LABEL;
    this.title.caption = CodeRibbonFuzzyFileOpenerWidget.LABEL;
    this.title.closable = true;
    this.title.iconClass = "fa fa-window-maximize"; // example widget icon.
    this.update();
  }

  render(): React.ReactElement {
    const header = `This is a sample widget which simply calls the messageService in order to display an info message to end users.`;
    return (
      <div id="widget-container">
        <AlertMessage type="INFO" header={header} />
        <button
          className="theia-button secondary"
          title="Display Message"
          onClick={(_a) => this.displayMessage()}
        >
          Display Message
        </button>
      </div>
    );
  }

  @inject(MessageService)
  protected readonly messageService!: MessageService;

  protected displayMessage(): void {
    this.messageService.info(
      "Congratulations: My Widget Successfully Created!",
    );
  }
}

export const TestOpenFFOCommand: Command = { id: 'coderibbon:test-ffo' };

@injectable()
export class CodeRibbonFuzzyFileOpenerContribution extends AbstractViewContribution<CodeRibbonFuzzyFileOpenerWidget> {
  constructor() {
    super({
      widgetId: CodeRibbonFuzzyFileOpenerWidget.ID,
      widgetName: CodeRibbonFuzzyFileOpenerWidget.LABEL,
      defaultWidgetOptions: { area: 'main' },
      toggleCommandId: TestOpenFFOCommand.id
    });
  }

  override registerCommands(commands: CommandRegistry): void {
    commands.registerCommand(TestOpenFFOCommand, {
      execute: () => super.openView({ activate: false, reveal: true })
    });
  }

  // registerMenus(menus:)
}
