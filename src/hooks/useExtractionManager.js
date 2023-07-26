import { useCallback, useContext, useMemo } from 'react';
import { Extractor } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import actionStages from '~/lib/actionStages';
import useCrewContext from './useCrewContext';
import useLot from './useLot';
import useActionItems from './useActionItems';

const useExtractionManager = (asteroidId, lotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(asteroidId, lotId);

  const payload = useMemo(() => ({
    asteroidId,
    lotId,
    crewId: crew?.i
  }), [asteroidId, lotId, crew?.i]);

  // status flow
  // READY > EXTRACTING > READY_TO_FINISH > FINISHING
  const [currentExtraction, extractionStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      completionTime: null,
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
    if (lot?.building?.extraction?.status === Extractor.STATUSES.RUNNING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ExtractionStart'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.lotId === lotId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew.crewmates;
        current.destinationLotId = actionItem.event.returnValues.destinationLotId;
        current.destinationInventoryId = actionItem.event.returnValues.destinationInventoryId;
        current.sampleId = actionItem.event.returnValues.sampleId;
      }
      current.completionTime = lot.building.extraction.completionTime;
      current.resourceId = lot.building.extraction.resourceId;
      current.startTime = lot.building.extraction.startTime;
      current.yield = lot.building.extraction.yield;
      current.isCoreSampleUpdated = true;
      
      if(getStatus('FINISH_EXTRACTION', payload) === 'pending') {
        status = 'FINISHING';
        stage = actionStages.COMPLETING;
      } else if (lot.building.extraction.completionTime && lot.building.extraction.completionTime <= liveBlockTime) {
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
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, lot?.building?.extraction?.status]);

  const startExtraction = useCallback((amount, coreSample, destinationLot) => {
    execute('START_EXTRACTION', {
      ...payload,
      amount,
      resourceId: coreSample.resourceId,
      sampleId: coreSample.sampleId,
      destinationLotId: destinationLot.i,
      destinationInventoryId: 1 // TODO: probably should not hard-code this
    })
  }, [payload]);

  const finishExtraction = useCallback(() => {
    execute('FINISH_EXTRACTION', payload)
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
