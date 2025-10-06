/** @format */

import { inject, injectable } from "@theia/core/shared/inversify";
import {
  MonacoQuickInputService,
  MonacoQuickInputImplementation,
} from "@theia/monaco/lib/browser/monaco-quick-input-service";
import { StandaloneServices } from "@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices";
import { IStandaloneThemeService } from "@theia/monaco-editor-core/esm/vs/editor/standalone/common/standaloneTheme";
import { ILayoutService } from "@theia/monaco-editor-core/esm/vs/platform/layout/browser/layoutService";
import { IInstantiationService } from "@theia/monaco-editor-core/esm/vs/platform/instantiation/common/instantiation";
import {
  IContextKey,
  IContextKeyService,
} from "@theia/monaco-editor-core/esm/vs/platform/contextkey/common/contextkey";
import {
  IQuickInputOptions,
  IQuickInputStyles,
} from "@theia/monaco-editor-core/esm/vs/platform/quickinput/browser/quickInput";
import { QuickInputController } from "@theia/monaco-editor-core/esm/vs/platform/quickinput/browser/quickInputController";
import {
  IHoverDelegate,
  IHoverDelegateOptions,
} from "@theia/monaco-editor-core/esm/vs/base/browser/ui/hover/hoverDelegate";
import { IHoverWidget } from "@theia/monaco-editor-core/esm/vs/base/browser/ui/hover/hover";

import { crdebug } from "./cr-logger";

// HoverDelegate direct copy:
// https://github.com/eclipse-theia/theia/blob/008c8340465f7e42298839881d814863bef0b039/packages/monaco/src/browser/monaco-quick-input-service.ts#L63-L72
class HoverDelegate implements IHoverDelegate {
  showHover(
    options: IHoverDelegateOptions,
    focus?: boolean | undefined,
  ): IHoverWidget | undefined {
    return undefined;
  }
  onDidHideHover?: (() => void) | undefined;
  delay: number;
  placement?: "mouse" | "element" | undefined;
  showNativeHover?: boolean | undefined;
}

@injectable()
// @ts-expect-error Class 'EmbeddableMonacoQuickInputImplementation' incorrectly extends base class 'MonacoQuickInputImplementation'.
export class EmbeddableMonacoQuickInputImplementation extends MonacoQuickInputImplementation {
  private initContainer(): void {
    const container = (this.container = document.createElement("div"));
    container.id = "quick-input-container";
    // TODO replace with a way to fetch this element out
    document.body.appendChild(this.container);
    crdebug("EMQIS: adding container element", this);
  }

  private override initController(): void {
    // this.initController();
    const contextKeyService = StandaloneServices.get(IContextKeyService);
    const instantiationService = StandaloneServices.get(IInstantiationService);
    const layoutService = StandaloneServices.get(ILayoutService);

    const options: IQuickInputOptions = {
      idPrefix: "quickInput_",
      container: this.container,
      // @ts-expect-error computeStyles is private
      styles: this.computeStyles(),
      ignoreFocusOut: () => true,
      backKeybindingLabel: () => undefined,
      setContextKey: (id?: string) => this.setContextKey(id),
      returnFocus: () => this.container.focus(),
      hoverDelegate: new HoverDelegate(),
      linkOpenerDelegate: () => {
        // @monaco-uplift: not sure what to do here
      },
    };
    this.controller = new QuickInputController(
      options,
      layoutService,
      instantiationService,
      contextKeyService,
    );
    // @ts-expect-error updateLayout is private
    this.updateLayout();
  }
}

@injectable()
// @ts-expect-error Class 'EmbeddableMonacoQuickInputService' incorrectly extends base class 'MonacoQuickInputService'.
export class EmbeddableMonacoQuickInputService extends MonacoQuickInputService {
  @inject(EmbeddableMonacoQuickInputImplementation)
  private override monacoService: EmbeddableMonacoQuickInputImplementation;
}
