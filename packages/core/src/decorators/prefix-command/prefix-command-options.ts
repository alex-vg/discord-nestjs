import { PrefixCommandGlobalOptions } from '../../definitions/interfaces/prefix-command-global-options';

export interface PrefixCommandOptions extends PrefixCommandGlobalOptions {
  /**
   * Command name
   */
  name: string;

  /**
   * Command prefix (If set, it overrides the global)
   */
  prefix?: string;
}
