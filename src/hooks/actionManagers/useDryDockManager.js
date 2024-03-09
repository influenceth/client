import { useCallback, useContext, useMemo } from 'react';
import { DryDock, Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useActionItems from '~/hooks/useActionItems';
import useBlockTime from '~/hooks/useBlockTime';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import actionStages from '~/lib/actionStages';

const useDryDockManager = (lotId, slot = 1) => {
  const { actionItems, readyItems } = useActionItems();
  const blockTime = useBlockTime();
  const { execute, getPendingTx, getStatus } = useContext(ChainTransactionContext);
  const { crew } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const payload = useMemo(() => ({
    dry_dock: { id: lot?.building?.id, label: Entity.IDS.BUILDING },
    dry_dock_slot: slot,
    caller_crew: { id: crew?.id, label: Entity.IDS.CREW }
  }), [lot?.building, crew?.id, slot]);

  const slotDryDock = useMemo(() => lot?.building?.DryDocks?.find((e) => e.slot === slot), [lot?.building, slot]);

  // status flow
  // READY > ASSEMBLING > READY_TO_FINISH > FINISHING
  const [currentAssembly, assemblyStatus, actionStage] = useMemo(() => {
    let current = {
      _cachedData: null,
      _isMyAction: true,
      finishTime: null,
      origin: null,
      originSlot: null,
      shipId: null,
      shipType: null,
      startTime: null,
    };
  
    let status = 'READY';
    let stage = actionStages.NOT_STARTED;
    if (slotDryDock?.status === DryDock.STATUSES.RUNNING) {
      let actionItem = (actionItems || []).find((item) => (
        item.event.name === 'ShipAssemblyStarted'
        && item.event.returnValues.dryDock.id === lot.building.id
        && item.event.returnValues.dryDockSlot === slot
      ));
      if (actionItem) {
        current._cachedData = actionItem.data;
        current.origin = actionItem.event.returnValues.origin;
        current.originSlot = actionItem.event.returnValues.originSlot;
        current.shipType = actionItem.event.returnValues.shipType;
        current.startTime = actionItem.event.timestamp;
      } else {
        current._isMyAction = false;
      }
      current.shipId = slotDryDock?.outputShip.id;
      current.finishTime = slotDryDock?.finishTime;
      
      if(getStatus('AssembleShipFinish', payload) === 'pending') {
        status = 'FINISHING';
        stage = actionStages.COMPLETING;
      } else if (slotDryDock?.finishTime && slotDryDock.finishTime <= blockTime) {
        status = 'READY_TO_FINISH';
        stage = actionStages.READY_TO_COMPLETE;
      } else {
        status = 'ASSEMBLING';
        stage = actionStages.IN_PROGRESS;
      }
    } else {
      const startTx = getPendingTx('AssembleShipStart', payload);
      if (startTx) {
        current.origin = startTx.vars.origin;
        current.originSlot = startTx.vars.origin_slot;
        current.shipType = startTx.vars.ship_type;
        status = 'ASSEMBLING';
        stage = actionStages.STARTING;
      }
    }

    return [
      status === 'READY' ? null : current,
      status,
      stage
    ];
  }, [actionItems, blockTime, readyItems, getPendingTx, getStatus, payload, slotDryDock?.status]);

  const startShipAssembly = useCallback((shipType, origin, originSlot) => {
    execute(
      'AssembleShipStart',
      {
        ...payload,
        ship_type: shipType,
        origin: { id: origin.id, label: origin.label },
        origin_slot: originSlot
      },
      {
        lotId
      }
    )
  }, [payload]);

  const finishShipAssembly = useCallback((destination) => {
    execute(
      'AssembleShipFinish', 
      {
        ...payload,
        destination: { id: destination.id, label: destination.label }
      },
      {
        lotId,
        shipType: currentAssembly?.shipType
      }
    );
  }, [currentAssembly?.shipType, payload]);

  return {
    startShipAssembly,
    finishShipAssembly,

    assemblyStatus,
    currentAssembly,
    actionStage
  };
};

export default useDryDockManager;
