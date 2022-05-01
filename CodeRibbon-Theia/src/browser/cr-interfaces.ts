
import {
  Widget,
  BoxLayout,
} from '@phosphor/widgets';

import { CodeRibbonTheiaRibbonLayout } from './cr-ribbon-layout';

export namespace RibbonPanel {
  export type InsertMode = (
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
  export interface IAddOptions {
    /**
     * Options for inserting a Widget onto the Ribbon, when undefined the user's
     * preference will be used
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
    /**
     * If true, will not scroll to nor focus / activate the added widget
     */
    preventFocus?: boolean
  }
  export interface IOptions {
    direction?: BoxLayout.Direction; // only horizontal
    alignment?: BoxLayout.Alignment; // only ...
    spacing?: number;
    layout?: CodeRibbonTheiaRibbonLayout;
  }
  export interface ILayoutConfig {
    // TODO actual definition of serializable layout config
    // NOTE probably a sequence of RibbonStrip.ILayoutConfig ???
    main: any | null;
  }
}

export namespace RibbonStrip {
  export type InsertMode = (
    // Place a new patch above or below the current one in this column
    'split-down' |
    'split-up' |

    // Place a new patch at the top or bottom of this column
    'split-top' |
    'split-bottom' |

    // Create a new column on the right or left of the current, put widget there
    'split-right' |
    'split-left' |

    // Remove active item, replace
    'replace-current'
  )
  export interface IAddOptions {
    /**
     * Options for inserting a Widget onto the RibbonStrip
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
  export interface IOptions {
    // how many empty patches to init
    size?: number;
  }
  export interface ILayoutConfig {
    // main: ITabAreaConfig | ISplitAreaConfig | null;
    main: any;
  }
}
