/**
 * Generated using theia-extension-generator
 */
import { ContainerModule } from '@theia/core/shared/inversify';
import { CodeRibbonTheiaContribution } from './CodeRibbon-Theia-contribution';


export default new ContainerModule(bind => {

    // Replace this line with the desired binding, e.g. "bind(CommandContribution).to(CodeRibbonTheiaContribution)
    bind(CodeRibbonTheiaContribution).toSelf();
});
