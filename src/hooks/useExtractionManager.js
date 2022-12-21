import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Extraction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';
import useActionItems from './useActionItems';

const useExtractionManager = (asteroidId, plotId) => {
  const actionItems = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({
    asteroidId,
    plotId,
    crewId: crew?.i
  }), [asteroidId, plotId, crew?.i]);

  const startExtraction = useCallback((amount, coreSample, destinationPlot) => {
    execute('START_EXTRACTION', {
      ...payload,
      amount: amount * 0.001,
      resourceId: coreSample.resourceId,
      sampleId: coreSample.sampleId,
      destinationLotId: destinationPlot.i,
      destinationInventoryId: destinationPlot.building?.i
    })
  }, [payload]);

  const finishExtraction = useCallback(() => {
    execute('FINISH_EXTRACTION', payload)
  }, [payload]);

  // status flow
  // READY > EXTRACTING > READY_TO_FINISH > FINISHING
  const extractionStatus = useMemo(() => {
    if (plot?.building) {
      if (plot.building.extractionStatus === Extraction.STATUS_EXTRACTING) {
        if(getStatus('FINISH_EXTRACTION', payload) === 'pending') {
          return 'FINISHING';
        // TODO: this should be extraction committed time
        } else if (plot.building.committedTime && (plot.building.committedTime < getAdjustedNow())) {
          return 'READY_TO_FINISH';
        }
        return 'EXTRACTING';
      } else if (getStatus('START_EXTRACTION', payload) === 'pending') {
        return 'EXTRACTING';
      }
    }
    return 'READY';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [plot?.building?.extractionStatus, getStatus, payload, actionItems]);


  return {
    extractionStatus,
    startExtraction,
    finishExtraction
  };
};

export default useExtractionManager;
