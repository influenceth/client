import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction, CoreSample, Inventory } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrew from './useCrew';
import usePlot from './usePlot';
import { getAdjustedNow } from '~/lib/utils';
import useActionItems from './useActionItems';

const useCoreSampleManager = (asteroidId, plotId, resourceId, isImprovement = false) => {
  const actionItems = useActionItems();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrew();
  const { data: plot } = usePlot(asteroidId, plotId);

  const [currentSampleId, setCurrentSampleId] = useState();

  const getPayload = useCallback((sample) => {
    return ({
      asteroidId,
      plotId,
      resourceId,
      sampleId: sample?.sampleId || 0,
      crewId: crew?.i
    });
  }, [asteroidId, plotId, resourceId, crew?.i]);

  const getSampleStatus = useCallback((sample) => {
    const payload = getPayload(sample);
    if (getStatus('START_CORE_SAMPLE', payload) === 'pending') {
      return 'SAMPLING';
    } else if (getStatus('FINISH_CORE_SAMPLE', payload) === 'pending') {
      return 'FINISHING';
    } else if (sample) {
      if (sample.status === CoreSample.STATUS_USED) {
        return 'USED';
      } else if (sample.status === CoreSample.STATUS_STARTED) {
        if (sample.committedTime < getAdjustedNow()) {
          return 'READY_TO_FINISH';
        }
        return 'SAMPLING';
      }
    }
    return 'READY';

  // NOTE: actionItems is not used in this function, but it being updated suggests
  //  that something might have just gone from SAMPLING to READY_TO_FINISH
  //  so it is a good time to re-evaluate the status
  }, [actionItems, getStatus, getPayload]);

  const lotStatus = useMemo(() => {
    return (plot?.coreSamples || [])
      .filter((c) => c.resourceId === Number(resourceId) && c.owner === Number(crew?.i) && c.status !== CoreSample.STATUS_USED)
      .filter((sample) => !isImprovement === !Object.keys(sample).includes('initialYield'))
      .reduce((acc, sample) => {
        const status = getSampleStatus(sample);
        if (status === 'SAMPLING' || status === 'FINISHING') {
          return status;
        } else if (status === 'READY_TO_FINISH' && acc === 'READY') {
          return status;
        }
        return acc;
      }, 'READY');
  }, [plot?.coreSamples, isImprovement, getSampleStatus]);

  const currentSample = useMemo(() => {
    return (plot?.coreSamples || []).find((c) => c.id === currentSampleId);
  }, [currentSampleId, plot?.coreSamples]);

  const samplingStatus = useMemo(() => {
    return getSampleStatus(currentSample);
  }, [currentSample, getSampleStatus]);

  useEffect(() => {
    if (!currentSampleId) {
      const eligibleSamples = (plot?.coreSamples || [])
        .filter((c) => c.resourceId === Number(resourceId) && c.owner === Number(crew?.i) && c.status !== CoreSample.STATUS_USED)
        .filter((c) => !isImprovement === !Object.keys(c).includes('initialYield'));

      // default to an in-process sample if there is one
      const activeSample = eligibleSamples.find((c) => ['SAMPLING', 'FINISHING', 'READY_TO_FINISH'].includes(getSampleStatus(c)));
      if (activeSample) {
        setCurrentSampleId(activeSample.id);

      // else, if this is improvement mode and there is only one option that I own, default to that
      } else if (isImprovement) {
        const mySamples = eligibleSamples.filter((s) => s.owner === Number(crew?.i));
        if (mySamples.length === 1) {
          setCurrentSampleId(mySamples[0].id);
        }
      }
    }
  }, [currentSampleId, getSampleStatus, plot?.coreSamples]);

  const startSampling = useCallback(() => {
    execute('START_CORE_SAMPLE', getPayload(currentSample))
  }, [currentSampleId, getPayload]);

  const finishSampling = useCallback(() => {
    execute('FINISH_CORE_SAMPLE', getPayload(currentSample))
  }, [currentSample, getPayload]);

  const getInitialTonnage = useCallback((sample) => {
    return Object.keys(sample).includes('initialYield')
      ? sample.initialYield * Inventory.RESOURCES[sample.resourceId].massPerUnit
      : undefined;
  }, []);

  const selectSampleToImprove = useCallback((sample) => {
    return setCurrentSampleId(sample?.id);
  }, []);
  
  return {
    currentSample,
    selectSampleToImprove,
    startSampling,
    finishSampling,
    getInitialTonnage,
    lotStatus,
    samplingStatus,
  };
};

export default useCoreSampleManager;
