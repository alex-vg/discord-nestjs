import { Injectable, Logger } from '@nestjs/common';
import { ClientEvents } from 'discord.js';

import { ExecutionContext } from '../../definitions/interfaces/execution-context';
import { ReflectMetadataProvider } from '../../providers/reflect-metadata.provider';
import { ClientService } from '../../services/client.service';
import { DtoService } from '../../services/dto.service';
import { CollectorExplorer } from '../collector/collector.explorer';
import { FilterExplorer } from '../filter/filter.explorer';
import { GuardExplorer } from '../guard/guard.explorer';
import { MethodExplorer } from '../interfaces/method-explorer';
import { MethodExplorerOptions } from '../interfaces/method-explorer-options';
import { MiddlewareExplorer } from '../middleware/middleware.explorer';
import { PipeExplorer } from '../pipe/pipe.explorer';

@Injectable()
export class EventExplorer implements MethodExplorer {
  private readonly logger = new Logger();

  constructor(
    private readonly metadataProvider: ReflectMetadataProvider,
    private readonly discordClientService: ClientService,
    private readonly middlewareExplorer: MiddlewareExplorer,
    private readonly guardExplorer: GuardExplorer,
    private readonly filterExplorer: FilterExplorer,
    private readonly pipeExplorer: PipeExplorer,
    private readonly collectorExplorer: CollectorExplorer,
    private readonly dtoService: DtoService,
  ) {}

  async explore(options: MethodExplorerOptions): Promise<void> {
    const { instance, methodName } = options;
    let eventMethod: 'on' | 'once' = 'on';
    let metadata = this.metadataProvider.getOnEventDecoratorMetadata(
      instance,
      methodName,
    );
    if (!metadata) {
      metadata = this.metadataProvider.getOnceEventDecoratorMetadata(
        instance,
        methodName,
      );
      eventMethod = 'once';
      if (!metadata) return;
    }
    const { event } = metadata;
    this.logger.log(
      `Subscribe to event(${eventMethod}): ${event}`,
      instance.constructor.name,
    );

    const dtoInstance = await this.dtoService.createDtoInstance(
      instance,
      methodName,
    );

    this.discordClientService
      .getClient()
      [eventMethod](
        event,
        async (...eventArgs: ClientEvents[keyof ClientEvents]) => {
          try {
            //#region apply middleware, guard, pipe
            await this.middlewareExplorer.applyMiddleware(event, eventArgs);
            const isAllowFromGuards = await this.guardExplorer.applyGuard({
              instance,
              methodName,
              event,
              eventArgs,
            });
            if (!isAllowFromGuards) return;

            const pipeResult = await this.pipeExplorer.applyPipe({
              instance,
              methodName,
              event,
              eventArgs,
              initValue: eventArgs,
              metatype: dtoInstance?.constructor,
              commandNode: { dtoInstance },
            });
            //#endregion

            const collectors = await this.collectorExplorer.applyCollector({
              instance,
              methodName,
              event,
              eventArgs,
            });

            const executionContext: ExecutionContext = {
              collectors,
            };

            const handlerArgs = dtoInstance
              ? [pipeResult, ...eventArgs]
              : eventArgs;

            await instance[methodName](...handlerArgs, executionContext);
          } catch (exception) {
            const isTrowException = await this.filterExplorer.applyFilter({
              instance,
              methodName,
              event,
              eventArgs,
              exception,
            });

            if (isTrowException) throw exception;
          }
        },
      );
  }
}
