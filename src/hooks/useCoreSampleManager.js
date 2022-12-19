import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';
import useActionItems from './useActionItems';

const useCoreSampleManager = (asteroidId, plotId, resourceId) => {
  const actionItems = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const [sampleId, setSampleId] = useState();
  const selectSampleToImprove = useCallback((improveId) => {
    setSampleId(improveId)
  }, []);

  const payload = useMemo(() => ({
    asteroidId,
    plotId,
    crewId: crew?.i
  }), [asteroidId, plotId, crew?.i]);

  const currentSamplingProcess = useMemo(() => {
    if (plot?.coreSamples && crew?.i) {
      const sample = plot?.coreSamples.find((c) => c.owner === crew.i && c.status < 2);
      if (sample) {
        sample.sampleId = plot?.coreSamples.length;
        console.log('currentSamplingProcess', sample);
        return sample;
      }
    }
    return null;
  }, [plot?.coreSamples, crew?.i]);

  const lastSample = useMemo(() => {

  }, [plot?.coreSamples, crew?.i]);

  const startSampling = useCallback(() => {
    execute(
      'START_CORE_SAMPLE',
      {
        sampleId,
        resourceId,
        ...payload,
      }
    )
  }, [payload, resourceId, sampleId]);

  const finishSampling = useCallback(() => {
    execute(
      'FINISH_CORE_SAMPLE',
      {
        sampleId: currentSamplingProcess?.sampleId,
        resourceId: currentSamplingProcess?.resourceId,
        ...payload,
      }
    )
  }, [payload, currentSamplingProcess]);

  // status flow
  const samplingStatus = useMemo(() => {
    if (getStatus('START_CORE_SAMPLE', payload) === 'pending') {
      return 'SAMPLING';
    } else if (getStatus('FINISH_CORE_SAMPLE', payload) === 'pending') {
      return 'FINISHING';
    } else if (currentSamplingProcess) {
      if (currentSamplingProcess.committedTime < getAdjustedNow()) {
        return 'READY_TO_FINISH';
      }
      return 'SAMPLING';
    }
    return 'READY';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from UNDER_CONSTRUCTION to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [currentSamplingProcess, getStatus, payload, actionItems]);

  return {
    currentSamplingProcess,
    selectSampleToImprove,
    startSampling,
    finishSampling,
    samplingStatus,
  };
};

export default useCoreSampleManager;
