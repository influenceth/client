import { useCallback, useContext, useMemo } from 'react';
import { Entity, Extractor } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

// TODO: truly support multiple extractors
const useExtractionManager = (lotId, slot = 1) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const payload = useMemo(() => ({
    extractor: { id: lot?.building?.id, label: Entity.IDS.BUILDING },
    extractor_slot: slot,
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lot?.building, crew?.id, slot]);

  const slotExtractor = useMemo(() => lot?.building?.Extractors?.find((e) => e.slot === slot), [lot?.building, slot]);

  // status flow
  // READY > EXTRACTING > READY_TO_FINISH > FINISHING
  const [currentExtraction, extractionStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      finishTime: null,
      destination: null,
      destinationSlot: null,
      resourceId: null,
      depositId: null,
      startTime: null,
      yield: null,
      isCoreSampleUpdated: false
    };
    // 
    // TODO: destinationLotId --> destination, destinationInventoryId --> destinationSlot
  
    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    if (slotExtractor?.status === Extractor.STATUSES.RUNNING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'ResourceExtractionStarted'
        && item.event.returnValues.extractor.id === lot.building.id
        && item.event.returnValues.extractorSlot === slot
      ));
      if (actionItem) {
        // current._crewmates = actionItem.assets.crew.crewmates; // TODO: ...
        current.depositId = actionItem.event.returnValues.deposit.id;
        current.startTime = actionItem.event.timestamp;
      }
      current.destination = slotExtractor?.destination;
      current.destinationSlot = slotExtractor?.destinationSlot;
      current.finishTime = slotExtractor?.finishTime;
      current.resourceId = slotExtractor?.outputProduct;
      current.yield = slotExtractor?.yield;

      current.isCoreSampleUpdated = true;
      
      if(getStatus('ExtractResourceFinish', payload) === 'pending') {
        status = 'FINISHING';
        stage = actionStages.COMPLETING;
      } else if (slotExtractor?.finishTime && slotExtractor.finishTime <= liveBlockTime) {
        status = 'READY_TO_FINISH';
        stage = actionStages.READY_TO_COMPLETE;
      } else {
        status = 'EXTRACTING';
        stage = actionStages.IN_PROGRESS;
      }
    } else {
      const startTx = getPendingTx('ExtractResourceStart', payload);
      if (startTx) {
        current.depositId = startTx.vars.deposit.id;
        current.destination = startTx.vars.destination;
        current.destinationSlot = startTx.vars.destination_slot;
        current.resourceId = startTx.meta.resourceId;
        current.yield = startTx.vars.yield;
        status = 'EXTRACTING';
        stage = actionStages.STARTING;
      }
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, slotExtractor?.status]);

  const startExtraction = useCallback((amount, deposit, destination, destinationSlot) => {
    execute(
      'ExtractResourceStart',
      {
        ...payload,
        yield: amount,
        deposit: { id: deposit.id, label: deposit.label },
        destination: { id: destination.id, label: destination.label },
        destination_slot: destinationSlot
      },
      {
        resourceId: deposit.Deposit.resource,
        lotId
      }
    )
  }, [payload]);

  const finishExtraction = useCallback(() => {
    execute('ExtractResourceFinish', payload, { lotId });
  }, [payload]);

  return {
    startExtraction,
    finishExtraction,
    extractionStatus,
    currentExtraction,
    actionStage
  };
};

export default useExtractionManager;
