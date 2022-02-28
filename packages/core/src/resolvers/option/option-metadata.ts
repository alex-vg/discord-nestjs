import {
  ApplicationCommandOptionChoice,
  CommandOptionChannelResolvableType,
  CommandOptionChoiceResolvableType,
  CommandOptionNonChoiceResolvableType,
} from 'discord.js';
import { ChannelTypes } from 'discord.js/typings/enums';

import { ExcludeEnum } from '../../definitions/types/exclude-enum.type';

export interface OptionMetadata {
  [property: string]: {
    param: {
      description: string;
      name: string;
      required?: boolean;
      type?:
        | CommandOptionChoiceResolvableType
        | CommandOptionNonChoiceResolvableType
        | CommandOptionChannelResolvableType;
    };
    choice?: ApplicationCommandOptionChoice[];
    channelTypes?: ExcludeEnum<typeof ChannelTypes, 'UNKNOWN'>[];
  };
}
