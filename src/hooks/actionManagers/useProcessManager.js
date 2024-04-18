import { useCallback, useContext, useMemo } from 'react';
import { Entity, Processor } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useBlockTime from '~/hooks/useBlockTime';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

const useProcessManager = (lotId, slot) => {
  const { actionItems, readyItems } = useActionItems();
  const blockTime = useBlockTime();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const payload = useMemo(() => ({
    processor: { id: lot?.building?.id, label: Entity.IDS.BUILDING },
    processor_slot: slot,
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lot?.building, crew?.id, slot]);

  const processor = useMemo(() => lot?.building?.Processors?.find((e) => e.slot === slot), [lot?.building, slot]);

  // status flow
  // READY > PROCESSING > READY_TO_FINISH > FINISHING
  const [currentProcess, processStatus, actionStage] = useMemo(() => {
    let current = {
      _cachedData: null,
      _isMyAction: true,
      finishTime: null,
      destination: null,
      destinationSlot: null,
      origin: null,
      originSlot: null,
      primaryOutputId: null,
      processId: null,
      recipeTally: null,
      startTime: null,
    };
  
    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    if (processor?.status === Processor.STATUSES.RUNNING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'MaterialProcessingStarted'
        && item.event.returnValues.processor.id === lot.building.id
        && item.event.returnValues.processorSlot === slot
      ));
      if (actionItem) {
        current._cachedData = actionItem.data;
        current.origin = actionItem.event.returnValues.origin;
        current.originSlot = actionItem.event.returnValues.originSlot;
        current.startTime = actionItem.event.returnValues.startTime || actionItem.event.timestamp;
      } else {
        current._isMyAction = false;
      }
      current.destination = processor?.destination;
      current.destinationSlot = processor?.destinationSlot;
      current.finishTime = processor?.finishTime;
      current.primaryOutputId = processor?.outputProduct;
      current.processId = processor?.runningProcess;
      current.recipeTally = processor?.recipes;
      
      if(getStatus('ProcessProductsFinish', payload) === 'pending') {
        status = 'FINISHING';
        stage = actionStages.COMPLETING;
      } else if (processor?.finishTime && processor.finishTime <= blockTime) {
        status = 'READY_TO_FINISH';
        stage = actionStages.READY_TO_COMPLETE;
      } else {
        status = 'PROCESSING';
        stage = actionStages.IN_PROGRESS;
      }
    } else {
      const startTx = getPendingTx('ProcessProductsStart', payload);
      if (startTx) {
        current.destination = startTx.vars.destination;
        current.destinationSlot = startTx.vars.destination_slot;
        current.origin = startTx.vars.origin;
        current.originSlot = startTx.vars.origin_slot;
        current.primaryOutputId = startTx.vars.target_output;
        current.processId = startTx.vars.process;
        current.recipeTally = startTx.vars.recipes;

        status = 'PROCESSING';
        stage = actionStages.STARTING;
      }
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, blockTime, readyItems, getPendingTx, getStatus, payload, processor?.status]);

  const startProcess = useCallback(({ processId, primaryOutputId, recipeTally, origin, originSlot, destination, destinationSlot }) => {
    execute(
      'ProcessProductsStart',
      {
        ...payload,
        process: processId,
        target_output: primaryOutputId,
        recipes: recipeTally,
        origin: { id: origin.id, label: origin.label },
        origin_slot: originSlot,
        destination: { id: destination.id, label: destination.label },
        destination_slot: destinationSlot
      },
      {
        lotId,
      }
    )
  }, [lotId, payload, processor?.processorType]);

  const finishProcess = useCallback(() => {
    execute('ProcessProductsFinish', payload, { lotId, process: processor?.runningProcess });
  }, [lotId, payload, processor?.runningProcess]);

  return {
    startProcess,
    finishProcess,

    processStatus,
    currentProcess,
    actionStage
  };
};

export default useProcessManager;
