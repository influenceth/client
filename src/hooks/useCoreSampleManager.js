import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Construction, CoreSample, Inventory } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from './useCrewContext';
import usePlot from './usePlot';
import useActionItems from './useActionItems';

const useCoreSampleManager = (asteroidId, plotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: plot } = usePlot(asteroidId, plotId);

  const payload = useMemo(() => ({
    asteroidId,
    plotId,
    crewId: crew?.i
  }), [asteroidId, plotId, crew?.i]);

  // status flow
  // READY > SAMPLING > READY_TO_FINISH > FINISHING
  const [currentSample, samplingStatus] = useMemo(() => {
    let current = {
      _crewmates: null,
      completionTime: null,
      isNew: null,
      owner: null,
      resourceId: null,
      sampleId: null,
      startTime: null,
      active: false
    };

    let status = 'READY';
    const activeSample = plot?.coreSamples.find((c) => c.owner === crew?.i && c.status < CoreSample.STATUS_FINISHED);
    if (activeSample) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_CoreSampleStartSampling'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.lotId === plotId
        && item.event.returnValues.resourceId === activeSample.resourceId
        && item.event.returnValues.sampleId === activeSample.sampleId
      ));
      if (actionItem) current._crewmates = actionItem.assets.crew.crewmates;
      current.completionTime = activeSample.completionTime;
      current.isNew = !(activeSample.initialYield > 0);
      current.owner = activeSample.owner;
      current.resourceId = activeSample.resourceId;
      current.sampleId = activeSample.sampleId;
      current.startTime = activeSample.startTime;

      if (activeSample.completionTime < liveBlockTime) {
        if (getStatus('FINISH_CORE_SAMPLE', payload) === 'pending') {
          status = 'FINISHING';
        } else {
          status = 'READY_TO_FINISH';
        }
      } else {
        status = 'SAMPLING';
      }
    } else {
      const sampleTx = getPendingTx('START_CORE_SAMPLE', payload);
      if (sampleTx) {
        current.isNew = sampleTx.vars.sampleId === 0;
        current.owner = sampleTx.vars.crewId;
        current.resourceId = sampleTx.vars.resourceId;
        current.sampleId = sampleTx.vars.sampleId;
        status = 'SAMPLING';
      }
    }

    return [
      status === 'READY' ? null : current,
      status
    ];
  }, [actionItems, readyItems, getPendingTx, getStatus, payload, plot?.coreSamples]);

  const startSampling = useCallback((resourceId, sampleId = 0) => {
    execute('START_CORE_SAMPLE', {
      resourceId,
      sampleId: sampleId,
      ...payload
    })
  }, [payload]);

  const finishSampling = useCallback(() => {
    execute('FINISH_CORE_SAMPLE', {
      sampleId: currentSample.sampleId,
      resourceId: currentSample.resourceId,
      ...payload
    })
  }, [currentSample, payload]);

  return {
    startSampling,
    finishSampling,
    samplingStatus,
    currentSample,
  }
};

export default useCoreSampleManager;
