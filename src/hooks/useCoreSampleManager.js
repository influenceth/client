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
  const [currentSamplingAction, samplingStatus, actionStage] = useMemo(() => {
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
    const activeSample = (lot?.deposits || []).find((c) => c.Control.controller.id === crew?.i && c.Deposit.status < Deposit.STATUSES.SAMPLED);
    if (activeSample) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'Dispatcher_CoreSampleStartSampling'
        && item.event.returnValues.asteroidId === asteroidId
        && item.event.returnValues.lotId === lotId
        && item.event.returnValues.resourceId === activeSample.Deposit.resource
        && item.event.returnValues.sampleId === activeSample.id
      ));
      if (actionItem) {
        current._crewmates = actionItem.assets.crew.crewmates;
        current.startTime = actionItem.startTime;
      }
      current.finishTime = activeSample.Deposit.finishTime;
      current.isNew = !(activeSample.Deposit.initialYield > 0);
      current.owner = activeSample.Control.controller.id;
      current.resourceId = activeSample.Deposit.resource;
      current.sampleId = activeSample.id;

      if (activeSample.Deposit.finishTime <= liveBlockTime) {
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
    //  currentSamplingAction), then need to review references to this hook to make sure
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

  // manage the "completed" stage explicitly
  useEffect(() => {
    if (currentSamplingAction && actionStage === actionStages.COMPLETING) {
      if (completingSample?.resourceId !== currentSamplingAction.resourceId || completingSample?.sampleId !== currentSamplingAction.sampleId) {
        setCompletingSample(currentSamplingAction);
      }
    }
  }, [currentSamplingAction, actionStage]);

  const startSampling = useCallback((resourceId, sampleId = 0) => {
    execute('START_CORE_SAMPLE', {
      resourceId,
      sampleId: sampleId,
      ...payload
    })
  }, [payload]);

  const finishSampling = useCallback(() => {
    execute('FINISH_CORE_SAMPLE', {
      sampleId: currentSamplingAction.sampleId,
      resourceId: currentSamplingAction.resourceId,
      ...payload
    })
  }, [currentSamplingAction, payload]);

  return {
    startSampling,
    finishSampling,
    samplingStatus,
    currentSamplingAction,
    actionStage
  }
};

export default useCoreSampleManager;
