import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Deposit } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import actionStages from '~/lib/actionStages';
import useCrewContext from './useCrewContext';
import useLot from './useLot';
import useActionItems from './useActionItems';

const useCoreSampleManager = (asteroidId, lotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(asteroidId, lotId);

  const payload = useMemo(() => ({
    asteroidId,
    lotId,
    crewId: crew?.i
  }), [asteroidId, lotId, crew?.i]);

  const [completingSample, setCompletingSample] = useState();

  // status flow
  // READY > SAMPLING > READY_TO_FINISH > FINISHING
  const [currentSample, samplingStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      finishTime: null,
      isNew: null,
      owner: null,
      resourceId: null,
      sampleId: null,
      startTime: null,
      active: false
    };

    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    const activeSample = lot?.coreSamples.find((c) => c.owner === crew?.i && c.status < Deposit.STATUSES.SAMPLED);
    if (activeSample) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_CoreSampleStartSampling'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.lotId === lotId
        && item.event.returnValues.resourceId === activeSample.resourceId
        && item.event.returnValues.sampleId === activeSample.sampleId
      ));
      if (actionItem) current._crewmates = actionItem.assets.crew.crewmates;
      current.finishTime = activeSample.finishTime;
      current.isNew = !(activeSample.initialYield > 0);
      current.owner = activeSample.owner;
      current.resourceId = activeSample.resourceId;
      current.sampleId = activeSample.sampleId;
      current.startTime = activeSample.startTime;

      if (activeSample.finishTime <= liveBlockTime) {
        if (getStatus('FINISH_CORE_SAMPLE', payload) === 'pending') {
          status = 'FINISHING';
          stage = actionStages.COMPLETING;
        } else {
          status = 'READY_TO_FINISH';
          stage = actionStages.READY_TO_COMPLETE;
        }
      } else {
        status = 'SAMPLING';
        stage = actionStages.IN_PROGRESS;
      }
    } else {
      const sampleTx = getPendingTx('START_CORE_SAMPLE', payload);
      if (sampleTx) {
        current.isNew = sampleTx.vars.sampleId === 0;
        current.owner = sampleTx.vars.crewId;
        current.resourceId = sampleTx.vars.resourceId;
        current.sampleId = sampleTx.vars.sampleId;
        status = 'SAMPLING';
        stage = actionStages.IN_PROGRESS;
      }
    }

    // if did not update status beyond NOT_STARTED but there was a completingSample
    //  previously, must now be COMPLETED
    // NOTE: if ever change this to output different status as well (and / or
    //  currentSample), then need to review references to this hook to make sure
    //  behavior doesn't change (i.e. actionButtons)
    if (completingSample && stage === actionStages.NOT_STARTED) {
      stage = actionStages.COMPLETED;
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, completingSample, readyItems, getPendingTx, getStatus, payload, lot?.coreSamples]);

  useEffect(() => {
    if (currentSample && actionStage === actionStages.COMPLETING) {
      if (completingSample?.resourceId !== currentSample.resourceId || completingSample?.sampleId !== currentSample.sampleId) {
        setCompletingSample(currentSample);
      }
    }
  }, [currentSample, actionStage]);

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
    actionStage
  }
};

export default useCoreSampleManager;
