import { useCallback, useEffect, useRef } from 'react';
import { Asteroid, Building, Entity, Lot } from '@influenceth/sdk';
import { camelCase, cloneDeep } from 'lodash';

import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import SIMULATION_CONFIG from './simulationConfig';
import useSimulationState from '~/hooks/useSimulationState';

const getUuid = () => String(performance.now()).replace('.', '');
const transformReturnValues = (obj) => {
  return Object.keys(obj).reduce((acc, k) => ({ ...acc, [camelCase(k)]: obj[k] }), {});
}
const nowSec = () => Math.floor(Date.now() / 1e3);

const MockTransactionManager = () => {
  const { pendingTransactions } = useCrewContext();
  const simulation = useSimulationState();
  const getActivityConfig = useGetActivityConfig();

  const dispatchPendingTransactionComplete = useStore((s) => s.dispatchPendingTransactionComplete);
  const dispatchSimulationAddToInventory = useStore((s) => s.dispatchSimulationAddToInventory);
  const dispatchSimulationState = useStore((s) => s.dispatchSimulationState);
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const simulateResultingEvent = useCallback((tx) => {
    let events = [];
    switch(tx.key) {
      case 'AcceptPrepaidAgreement': {
        // update simulation state
        const { asteroidId, lotIndex } = Lot.toPosition(tx.vars.target.id);
        const closest = Asteroid.getClosestLots({
          centerLot: lotIndex,
          lotTally: Asteroid.getSurfaceArea(asteroidId),
          findTally: 4
        });

        const lotDetails = { leaseTerm: tx.vars.term, leaseRate: Math.floor(tx.vars.termPrice / tx.vars.term) };
        const lotsLeased = { [tx.vars.target.id]: { ...lotDetails } };
        closest.forEach((lotIndex) => {
          lotsLeased[Lot.toId(asteroidId, lotIndex)] = { ...lotDetails };
        });
        dispatchSimulationState('lots', lotsLeased);
        dispatchSimulationState('sway', SIMULATION_CONFIG.startingSway - tx.vars.termPrice);

        // mimic event
        events.push({
          event: 'PrepaidAgreementAccepted',
          name: 'PrepaidAgreementAccepted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: Math.floor(Date.now() / 1000),
          returnValues: transformReturnValues({
            ...tx.vars,
            initial_term: 30,
            notice_period: 30, // may not be accurate, but not important
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'ConstructionPlan': {
        const buildingId = SIMULATION_CONFIG.buildingIds[tx.vars.building_type];
        const lotUpdate = cloneDeep(simulation.lots);
        lotUpdate[tx.vars.lot.id].buildingId = buildingId;
        lotUpdate[tx.vars.lot.id].buildingStatus = Building.CONSTRUCTION_STATUSES.PLANNED;
        lotUpdate[tx.vars.lot.id].buildingType = Number(tx.vars.building_type);
        dispatchSimulationState('lots', lotUpdate);

        // mimic event
        events.push({
          event: 'ConstructionPlanned',
          name: 'ConstructionPlanned',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            asteroid: { id: Lot.toPosition(tx.vars.lot.id)?.asteroidId, label: Entity.IDS.ASTEROID },
            building: { id: buildingId, label: Entity.IDS.BUILDING },
            grace_period_end: nowSec() + 86400,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'ConstructionStart': {
        const lotUpdate = cloneDeep(simulation.lots);
        lotUpdate[tx.meta.lotId].buildingStatus = Building.CONSTRUCTION_STATUSES.OPERATIONAL; // TODO: under construction
        dispatchSimulationState('lots', lotUpdate);

        // mimic event
        events.push({
          event: 'ConstructionStarted',
          name: 'ConstructionStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            finish_time: nowSec() + 86400,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'BulkFillSellOrder': {
        tx.vars.forEach((vars) => {
          simulateResultingEvent({
            key: 'FillSellOrder',
            vars,
            meta: tx.meta
          })
        });
        break;
      }

      case 'FillSellOrder': {
        // TODO: ...
        // dispatchSimulationState('deliveries', lotUpdate);
        dispatchSimulationAddToInventory(tx.vars.destination, tx.vars.destination_slot, tx.vars.product, tx.vars.amount);
        dispatchSimulationState('sway', -(tx.vars.payments.toExchange + tx.vars.payments.toPlayer), 'increment');

        // mimic event
        events.push({
          event: 'SellOrderFilled',
          name: 'SellOrderFilled',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }
    }

    // no need to invalidate data b/c no real updates made
    events.forEach((e) => {
      const mockActivity = {
        id: getUuid(),
        addresses: [],
        entities: [],
        event: e,
        hash: getUuid(),
        hiddenBy: [],
        unresolvedFor: [], // TODO...
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatchSimulationState('activities', mockActivity, 'append');

      const config = getActivityConfig(mockActivity);
      // TODO: hydrate activity?
      // triggerAlert as needed
      if (config?.triggerAlert && config?.logContent) {
        createAlert({
          type: 'ActivityLog',
          data: config.logContent,
          duration: 10000
        })
      }

      // TODO: refreshReadyAt?
    });

    // tx complete
    dispatchPendingTransactionComplete(tx.txHash);
  }, [simulation]);

  const processed = useRef([]);
  useEffect(() => {
    pendingTransactions.forEach((tx) => {
      if (!processed.current.includes(tx.txHash)) {
        processed.current.push(tx.txHash);
        
        setTimeout(() => {
          simulateResultingEvent(tx);
          
          // TODO: if finishTime, decrement finishTime until finished (show in "fast forwarding" state)
        }, 3000);
      }
    });
  }, [pendingTransactions]);

  return null;
};

export default MockTransactionManager;