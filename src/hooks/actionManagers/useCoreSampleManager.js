import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Deposit, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

const useCoreSampleManager = (lotId) => {
  const { actionItems, readyItems, liveBlockTime } = useActionItems();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  // * only used by SampleDepositStart contract, but used for equality check on others
  const payload = useMemo(() => ({
    lot: { id: lotId, label: Entity.IDS.LOT },
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lotId]);

  const [completingSample, setCompletingSample] = useState();

  // status flow
  // READY > SAMPLING > READY_TO_FINISH > FINISHING
  const [currentSamplingAction, samplingStatus, actionStage] = useMemo(() => {
    let current = {
      _crewmates: null,
      finishTime: null,
      isNew: null,
      origin: null,
      originSlot: null,
      owner: null,
      resourceId: null,
      sampleId: null,
      startTime: null,
      active: false
    };

    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    const activeSample = (lot?.deposits || []).find((c) => {
      return c.Control.controller.id === crew?.id && c.Deposit.status < Deposit.STATUSES.SAMPLED
    });
    if (activeSample) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'SamplingDepositStarted'
        && item.event.returnValues.deposit.id === activeSample.id
      ));
      if (actionItem) {
        // current._crewmates = actionItem.assets.crew.crewmates;  // TODO: ...
        current.origin = actionItem.event.returnValues.origin;
        current.originSlot = actionItem.event.returnValues.originSlot;
        current.startTime = actionItem.event.timestamp;
      }
      current.finishTime = activeSample.Deposit.finishTime;
      current.isNew = !activeSample.Deposit.initialYield;
      current.owner = activeSample.Control.controller.id;
      current.resourceId = activeSample.Deposit.resource;
      current.sampleId = activeSample.id;

      if (activeSample.Deposit.finishTime <= liveBlockTime) {
        if (getStatus('SampleDepositFinish', payload) === 'pending') {
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
      const newSampleTx = getPendingTx('SampleDepositStart', payload);
      if (newSampleTx) {
        current.isNew = true;
        current.owner = newSampleTx.vars.caller_crew.id;
        current.origin = newSampleTx.vars.origin;
        current.originSlot = newSampleTx.vars.origin_slot;
        current.resourceId = newSampleTx.vars.resource;
        current.sampleId = null;
        status = 'SAMPLING';
        stage = actionStages.IN_PROGRESS;
      } else {
        const improveSampleTx = getPendingTx('SampleDepositImprove', payload);
        if (improveSampleTx) {
          current.isNew = false;
          current.owner = improveSampleTx.vars.crewId;
          current.resourceId = improveSampleTx.vars.resourceId;
          current.sampleId = improveSampleTx.vars.sampleId;
          status = 'SAMPLING';
          stage = actionStages.IN_PROGRESS;
        }
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
      if (completingSample?.sampleId !== currentSamplingAction.sampleId) {
        setCompletingSample(currentSamplingAction);
      }
    }
  }, [currentSamplingAction, actionStage, completingSample]);

  const startSampling = useCallback((resourceId, coreDrillSource) => {
    // console.log('coreDrillSource', coreDrillSource); return;
    execute('SampleDepositStart', {
      resource: resourceId,
      origin: { id: coreDrillSource.id, label: coreDrillSource.label },
      origin_slot: coreDrillSource.slot,
      ...payload
    })
  }, [payload]);

  const startImproving = useCallback((depositId, coreDrillSource) => {
    const sample = (lot?.deposits || []).find((c) => c.id === depositId);
    execute(
      'SampleDepositImprove',
      {
        deposit: { id: depositId, label: Entity.IDS.DEPOSIT },
        origin: { id: coreDrillSource.id, label: coreDrillSource.label },
        origin_slot: coreDrillSource.slot,
        ...payload
      },
      {
        lotId,
        resource: sample?.Deposit?.resource
      }
    )
  }, [lotId, payload]);

  const finishSampling = useCallback(() => {
    execute(
      'SampleDepositFinish',
      {
        deposit: { id: currentSamplingAction.sampleId, label: Entity.IDS.DEPOSIT },
        ...payload
      },
      { lotId, isNew: currentSamplingAction.isNew }
    )
  }, [currentSamplingAction, payload]);

  return {
    startSampling,
    startImproving,
    finishSampling,
    samplingStatus,
    currentSamplingAction,
    actionStage
  }
};

export default useCoreSampleManager;
