import { useCallback, useContext, useMemo } from 'react';
import { Extractor } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

// TODO: support multiple extractors
const useExtractionManager = (lotId, slot = 0) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const payload = useMemo(() => ({
    lotId,
    crewId: crew?.id
  }), [lotId, crew?.id]);

  // status flow
  // READY > EXTRACTING > READY_TO_FINISH > FINISHING
  const [currentExtractionAction, extractionStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      finishTime: null,
      destinationLotId: null,
      destinationInventoryId: null,
      resourceId: null,
      sampleId: null,
      startTime: null,
      yield: null,
      isCoreSampleUpdated: false
    };
  
    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    if (lot?.building?.Extractors?.[slot]?.status === Extractor.STATUSES.RUNNING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ExtractionStart'
        && item.event.returnValues.lotId === lotId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew.crewmates;
        current.destinationLotId = actionItem.event.returnValues.destinationLotId;
        current.destinationInventoryId = actionItem.event.returnValues.destinationInventoryId;
        current.sampleId = actionItem.event.returnValues.sampleId;
        current.startTime = actionItem.startTime;
      }
      current.finishTime = lot.building?.Extractors?.[slot]?.finishTime;
      current.resourceId = lot.building?.Extractors?.[slot]?.resourceId;
      current.yield = lot.building?.Extractors?.[slot]?.yield;
      current.isCoreSampleUpdated = true;
      
      if(getStatus('FINISH_EXTRACTION', payload) === 'pending') {
        status = 'FINISHING';
        stage = actionStages.COMPLETING;
      } else if (lot.building?.Extractors?.[slot]?.finishTime && lot.building?.Extractors?.[slot]?.finishTime <= liveBlockTime) {
        status = 'READY_TO_FINISH';
        stage = actionStages.READY_TO_COMPLETE;
      } else {
        status = 'EXTRACTING';
        stage = actionStages.IN_PROGRESS;
      }
    } else {
      const startTx = getPendingTx('START_EXTRACTION', payload);
      if (startTx) {
        current.destinationLotId = startTx.vars.destinationLotId;
        current.destinationInventoryId = startTx.vars.destinationInventoryId;
        current.resourceId = startTx.vars.resourceId;
        current.sampleId = startTx.vars.sampleId;
        current.yield = startTx.vars.amount;
        status = 'EXTRACTING';
        stage = actionStages.STARTING;
      }
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, lot?.building?.Extractors?.[slot]?.status]);

  const startExtraction = useCallback((amount, coreSample, destinationLot) => {
    execute(
      'START_EXTRACTION',
      {
        ...payload,
        amount,
        resourceId: coreSample.Deposit.resource,
        sampleId: coreSample.id,
        destinationLotId: destinationLot.id,
        destinationInventoryId: 1 // TODO: probably should not hard-code this
      },
      {
        resourceId: coreSample.Deposit.resource,
        lotId: destinationLot.id,
      }
    )
  }, [payload]);

  const finishExtraction = useCallback(() => {
    execute(
      'FINISH_EXTRACTION',
      payload,
      {
        lotId: payload.lotId // TODO: this will likely change w/ ecs
      }
    )
  }, [payload]);

  return {
    startExtraction,
    finishExtraction,
    extractionStatus,
    currentExtractionAction,
    actionStage
  };
};

export default useExtractionManager;
