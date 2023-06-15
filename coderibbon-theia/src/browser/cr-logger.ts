// import { injectable } from '@theia/core/shared/inversify';
//
// import { CommonMenus } from '@theia/core/lib/browser';
// import {
//   MenuContribution, MenuModelRegistry, MessageService, MenuPath, MAIN_MENU_BAR,
// } from '@theia/core/lib/common';

export var crdebug = (...args: any[]) => {
  console.log.apply(console, ["CR:", ...args]);
};
