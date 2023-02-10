import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Extraction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import useActionItems from './useActionItems';

const useExtractionManager = (asteroidId, plotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({
    asteroidId,
    plotId,
    crewId: crew?.i
  }), [asteroidId, plotId, crew?.i]);

  // status flow
  // READY > EXTRACTING > READY_TO_FINISH > FINISHING
  const [currentExtraction, extractionStatus] = useMemo(() => {
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
    if (plot?.building?.extraction?.status === Extraction.STATUS_EXTRACTING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_ExtractionStart'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.lotId === plotId
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew.crewmates;
        current.destinationLotId = actionItem.event.returnValues.destinationLotId;
        current.destinationInventoryId = actionItem.event.returnValues.destinationInventoryId;
        current.sampleId = actionItem.event.returnValues.sampleId;
      }
      current.completionTime = plot.building.extraction.completionTime;
      current.resourceId = plot.building.extraction.resourceId;
      current.startTime = plot.building.extraction.startTime;
      current.yield = plot.building.extraction.yield;
      current.isCoreSampleUpdated = true;
      
      if(getStatus('FINISH_EXTRACTION', payload) === 'pending') {
        status = 'FINISHING';
      } else if (plot.building.extraction.completionTime && plot.building.extraction.completionTime < liveBlockTime) {
        status = 'READY_TO_FINISH';
      } else {
        status = 'EXTRACTING';
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
      }
    }

    return [
      status === 'READY' ? null : current,
      status
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, plot?.building?.extraction?.status]);

  const startExtraction = useCallback((amount, coreSample, destinationPlot) => {
    execute('START_EXTRACTION', {
      ...payload,
      amount,
      resourceId: coreSample.resourceId,
      sampleId: coreSample.sampleId,
      destinationLotId: destinationPlot.i,
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
    currentExtraction
  };
};

export default useExtractionManager;
