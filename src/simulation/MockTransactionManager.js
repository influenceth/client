import { useCallback, useEffect, useRef } from 'react';
import { Asteroid, Building, Entity, Lot, Process, Product, Ship } from '@influenceth/sdk';
import { camelCase, cloneDeep } from 'lodash';

import useCrewContext from '~/hooks/useCrewContext';
import useGetActivityConfig from '~/hooks/useGetActivityConfig';
import useStore from '~/hooks/useStore';
import SIMULATION_CONFIG from './simulationConfig';
import useSimulationState from '~/hooks/useSimulationState';
import simulationConfig from './simulationConfig';

const getUuid = () => String(performance.now()).replace('.', '');
const transformReturnValues = (obj) => {
  return Object.keys(obj).reduce((acc, k) => ({ ...acc, [camelCase(k)]: obj[k] }), {});
}
const nowSec = () => Math.floor(Date.now() / 1e3);

const MockTransactionManager = () => {
  const { crew, pendingTransactions } = useCrewContext();
  const simulation = useSimulationState();
  const getActivityConfig = useGetActivityConfig();

  const dispatchPendingTransactionComplete = useStore((s) => s.dispatchPendingTransactionComplete);
  const dispatchSimulationActionItems = useStore((s) => s.dispatchSimulationActionItems);
  const dispatchSimulationActionItemResolutions = useStore((s) => s.dispatchSimulationActionItemResolutions);

  const dispatchSimulationAddToInventory = useStore((s) => s.dispatchSimulationAddToInventory);
  const dispatchSimulationLotState = useStore((s) => s.dispatchSimulationLotState);
  const dispatchSimulationState = useStore((s) => s.dispatchSimulationState);

  const createAlert = useStore(s => s.dispatchAlertLogged);

  // TODO: support renaming buildings and ships

  // TODO: reconcile this with activities
  const getMockActionItem = useCallback((event) => {
    return {
      _id: getUuid(),
      data: {
        crew: { id: crew.id, label: crew.label, uuid: crew.uuid, Crew: crew.Crew, Location: crew.Location },
        crewmates: crew._crewmates.map((c) => ({ id: c.id, label: c.label, uuid: c.uuid, Crewmate: c.Crewmate })),
        station: crew._station
      },
      event,
      unresolvedFor: [{ id: crew.id, label: crew.label, uuid: crew.uuid }],
      createdAt: new Date().toISOString()
    };
  }, [crew]);

  const simulateResultingEvent = useCallback((tx) => {
    let activities = [];
    let activityResolutions = [];
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
        dispatchSimulationState('sway', SIMULATION_CONFIG.startingSway - 5 * tx.vars.termPrice);

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
        dispatchSimulationLotState(
          tx.vars.lot.id,
          {
            buildingId,
            buildingStatus: Building.CONSTRUCTION_STATUSES.PLANNED,
            buildingType: Number(tx.vars.building_type)
          }
        );

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
        dispatchSimulationLotState(tx.meta.lotId, { buildingStatus: Building.CONSTRUCTION_STATUSES.OPERATIONAL }); // TODO: under construction

        // mimic event
        const event = {
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
        };
        events.push(event);

        // TODO: action item?
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

      case 'CreateSellOrder': {
        // remove product from warehouse
        dispatchSimulationAddToInventory(tx.vars.storage, tx.vars.storage_slot, tx.vars.product, -tx.vars.amount);

        // create order
        const returnValues = transformReturnValues({
          ...tx.vars,
          valid_time: nowSec() - 100,
          maker_fee: 0, // TODO: ...
          caller: SIMULATION_CONFIG.accountAddress
        });
        dispatchSimulationState('order', returnValues);
        
        // mimic event
        events.push({
          event: 'SellOrderCreated',
          name: 'SellOrderCreated',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues
        });
        break;
      }

      case 'SampleDepositStart': {
        // create deposit
        dispatchSimulationLotState(tx.vars.lot.id, { depositId: simulationConfig.depositId });

        // remove core drill
        dispatchSimulationAddToInventory(tx.vars.origin, tx.vars.origin_slot, Product.IDS.CORE_DRILL, -1);

        // mimic event
        const event = {
          event: 'SamplingDepositStartedV1',
          name: 'SamplingDepositStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            deposit: { id: simulationConfig.depositId, label: Entity.IDS.DEPOSIT },
            finish_time: nowSec() - 100,
            caller: SIMULATION_CONFIG.accountAddress
          })
        };
        events.push(event);
        activities.push(getMockActionItem(event));
        break;
      }

      case 'SampleDepositFinish': {
        const initialYield = 4621789; // TODO: real number for lots abundance? inflated number?

        // add yield to deposit
        const depositLotId = Object.keys(simulation.lots).find((k) => !!simulation.lots[k].depositId);
        dispatchSimulationLotState(depositLotId, { depositYield: initialYield, depositYieldRemaining: initialYield });

        // mimic event
        events.push({
          event: 'SampleDepositFinished',
          name: 'SampleDepositFinished',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            initial_yield: initialYield,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        activityResolutions.push('SamplingDepositStarted')
        break;
      }

      case 'ExtractResourceStart': {
        // subtract yield from deposit, add to warehouse
        dispatchSimulationLotState(tx.meta.lotId, { depositYieldRemaining: simulation.lots[tx.meta.lotId].depositYield - tx.vars.yield });
        dispatchSimulationAddToInventory(tx.vars.destination, tx.vars.destination_slot, tx.meta.resourceId, tx.vars.yield);

        // mimic event
        events.push({
          event: 'ExtractResourceStarted',
          name: 'ExtractResourceStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            resource: tx.meta.resourceId,
            finish_time: nowSec(),
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'ProcessProductsStart': {
        const process = Process.TYPES[tx.vars.process];

        // subtract inputs from warehouse
        Object.keys(process.inputs).forEach((resource) => {
          dispatchSimulationAddToInventory(tx.vars.origin, tx.vars.origin_slot, resource, -process.inputs[resource] * tx.vars.recipes);
        });
        
        // add outputs to warehouse
        // TODO (maybe): account for target_output
        Object.keys(process.outputs).forEach((resource) => {
          dispatchSimulationAddToInventory(tx.vars.destination, tx.vars.destination_slot, resource, process.outputs[resource] * tx.vars.recipes);
        });

        // mimic event
        events.push({
          event: 'MaterialProcessingStarted',
          name: 'MaterialProcessingStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            // inputs,
            // outputs,
            finish_time: nowSec(),
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'AssembleShipStart': {
        const process = Process.TYPES[Process.IDS.LIGHT_TRANSPORT_INTEGRATION];

        // subtract inputs from warehouse
        Object.keys(process.inputs).forEach((resource) => {
          dispatchSimulationAddToInventory(tx.vars.origin, tx.vars.origin_slot, resource, -process.inputs[resource]);
        });

        // put ship on empty lot
        const emptyLotId = Object.keys(simulation.lots).find((lotId) => !simulation.lots[lotId].buildingId);
        dispatchSimulationLotState(emptyLotId, { shipId: simulationConfig.shipId });

        // mimic event
        events.push({
          event: 'ShipAssemblyStartedV1',
          name: 'ShipAssemblyStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            ship: { id: simulationConfig.shipId, label: Entity.IDS.SHIP },
            finish_time: nowSec() - 100,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'StationCrew': {
        dispatchSimulationState('crewLocation', [
          Entity.formatEntity(tx.vars.destination),
          Entity.formatEntity({ id: tx.meta.destLotId, label: Entity.IDS.LOT }),
          Entity.formatEntity({ id: 1, label: Entity.IDS.ASTEROID }),
        ]);

        // mimic event
        events.push({
          event: 'CrewStationedV1',
          name: 'CrewStationed',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            origin_station: { id: 1, label: Entity.IDS.BUILDING },
            // finish_time: nowSec() - 100,
            destination_station: tx.vars.destination,
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'UndockShip': {
        const shipLotId = Object.keys(simulation.lots).find((lotId) => !!simulation.lots[lotId].shipId);
        dispatchSimulationState('crewLocation', [
          Entity.formatEntity(tx.vars.ship),
          Entity.formatEntity({ id: 1, label: Entity.IDS.ASTEROID }),
        ]);
        dispatchSimulationLotState(shipLotId, { shipId: simulationConfig.shipId, shipIsUndocked: true });

        // mimic event
        events.push({
          event: 'ShipUndocked',
          name: 'ShipUndocked',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            dock: { id: shipLotId, label: Entity.IDS.LOT },
            caller: SIMULATION_CONFIG.accountAddress
          })
        });
        break;
      }

      case 'InitializeAndStartTransit':
      case 'TransitBetweenStart': {

        // decrement propellant
        dispatchSimulationAddToInventory(
          { id: SIMULATION_CONFIG.shipId, label: Entity.IDS.SHIP },
          Ship.TYPES[Ship.IDS.LIGHT_TRANSPORT].propellantSlot,
          Product.IDS.HYDROGEN_PROPELLANT,
          -tx.meta.usedPropellantMass
        );
        
        // mark ship as inflight to destination (destination, arrival_time)
        const shipLotId = Object.keys(simulation.lots).find((lotId) => !!simulation.lots[lotId].shipId);
        dispatchSimulationLotState(shipLotId, { shipId: simulationConfig.shipId, shipIsUndocked: true, shipIsInFlight: true });

        dispatchSimulationState('crewLocation', [
          Entity.formatEntity(tx.vars.ship),
          Entity.formatEntity({ id: 1, label: Entity.IDS.SPACE }),
        ]);

        // mimic event
        events.push({
          event: 'TransitStarted',
          name: 'TransitStarted',
          logIndex: 1,
          transactionIndex: 1,
          transactionHash: tx.txHash,
          timestamp: nowSec(),
          returnValues: transformReturnValues({
            ...tx.vars,
            ship: { id: SIMULATION_CONFIG.shipId, label: Entity.IDS.SHIP },
            departure: tx.vars.departure_time,
            arrival: tx.vars.arrival_time,
            finish_time: nowSec() + 86400,
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

      // dispatchSimulationState('activities', mockActivity, 'append');

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

    // push/pop these from state... mockDataManager can handle
    if (activities?.length) dispatchSimulationActionItems(activities);
    if (activityResolutions?.length) dispatchSimulationActionItemResolutions(activityResolutions);

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