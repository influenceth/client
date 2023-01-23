import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import { starknetContracts as configs } from '@influenceth/sdk';
import { Contract, shortString } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

// TODO: now that all are on dispatcher, could probably collapse a lot of redundant code in getContracts
const getContracts = (account, queryClient) => ({
  'PURCHASE_ASTEROID': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => async ({ i }) => {
      const { price } = await contract.call('AsteroidSale_getPrice', [i]);
      const priceParts = Object.values(price).map((part) => BigInt(part).toString());
      const calls = [
        {
          contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [
            process.env.REACT_APP_STARKNET_DISPATCHER,
            ...priceParts
          ]
        },
        {
          contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
          entrypoint: 'AsteroidSale_purchase',
          calldata: [
            i,
            ...priceParts
          ]
        },
      ];
      return account.execute(calls);
    }
  },
  'NAME_ASTEROID': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i, name }) => contract.invoke('Asteroid_setName', [
      i,
      shortString.encodeShortString(name)
    ])
  },
  'START_ASTEROID_SCAN': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i, boost, _packed, _proofs }) => contract.invoke('Asteroid_startScan', [
      i,
      _packed.features,
      _proofs.features,
      boost,
      _packed.bonuses,
      _proofs.boostBonus,
    ]),
    isEqual: (txVars, vars) => txVars.i === vars.i,
    onConfirmed: (event, { i }) => {
      queryClient.invalidateQueries(['asteroids', i]);
    }
  },
  'FINISH_ASTEROID_SCAN': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i }) => contract.invoke('Asteroid_finishScan', [i]),
  },
  'SET_ACTIVE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ crewId, crewMembers }) => {
      if (crewId) {
        return contract.invoke(
          'Crew_setComposition',
          [
            crewId,
            [...crewMembers]
          ]
        );
      } else {
        return contract.invoke(
          'Crew_mint',
          [
            [...crewMembers]
          ]
        );
      }
    },
    isEqual: () => true,
  },
  // // NOTE: this is just for debugging vvv
  // 'PURCHASE_UNINITIALIZED_CREWMATE': {
  //   address: process.env.REACT_APP_STARKNET_DISPATCHER,
  //   config: configs.Dispatcher,
  //   transact: (contract) => async () => {
  //     const { price } = await contract.call('CrewmateSale_getPrice');
  //     const priceParts = Object.values(price).map((part) => part.toNumber());
  //     const calls = [
  //       {
  //         contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
  //         entrypoint: 'approve',
  //         calldata: [
  //           process.env.REACT_APP_STARKNET_DISPATCHER,
  //           ...priceParts
  //         ]
  //       },
  //       {
  //         contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  //         entrypoint: 'Crewmate_purchaseAdalian',
  //         calldata: [
  //           ...priceParts,
  //         ]
  //       },
  //     ];

  //     return account.execute(calls);
  //   },
  //   isEqual: () => true,
  // },
  // // ^^^
  'INITIALIZE_CREWMATE': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => async ({ i, name, features, traits, crewId = 0 }) => {
      return contract.invoke('Crewmate_initializeAdalian', [
        i,
        shortString.encodeShortString(name),
        [
          features.crewCollection,
          features.sex,
          features.body,
          features.crewClass,
          features.title,
          features.outfit,
          features.hair,
          features.facialFeature,
          features.hairColor,
          features.headPiece,
          features.bonusItem,
        ].map((x) => x.toString()),
        [
          traits.drive,
          traits.classImpactful,
          traits.driveCosmetic,
          traits.cosmetic,
        ].map((t) => t.id.toString()),
        crewId
      ]);
    },
    isEqual: (vars, txVars) => vars.i === txVars.i,
  },
  'PURCHASE_AND_INITIALIZE_CREWMATE': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => async ({ name, features, traits, crewId }) => {
      const { price } = await contract.call('CrewmateSale_getPrice');
      const priceParts = Object.values(price).map((part) => part.toNumber());
      const calls = [
        {
          contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
          entrypoint: 'approve',
          calldata: [
            process.env.REACT_APP_STARKNET_DISPATCHER,
            ...priceParts
          ]
        },
        {
          contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
          entrypoint: 'Crewmate_purchaseAndInitializeAdalian',
          calldata: [
            ...priceParts,
            shortString.encodeShortString(name),
            '11', // array len v
            ...[
              features.crewCollection,
              features.sex,
              features.body,
              features.crewClass,
              features.title,
              features.outfit,
              features.hair,
              features.facialFeature,
              features.hairColor,
              features.headPiece,
              features.bonusItem,
            ].map((x) => x.toString()),
            '4', // array len v
            ...[
              traits.drive,
              traits.classImpactful,
              traits.driveCosmetic,
              traits.cosmetic,
            ].map((t) => t.id.toString()),
            crewId.toString()
          ]
        },
      ];

      return account.execute(calls);
    },
    isEqual: () => true,
  },
  'NAME_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i, name }) => contract.invoke(
      'Crewmate_setName',
      [
        i,
        shortString.encodeShortString(name)
      ]
    ),
  },

  'START_CORE_SAMPLE': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, resourceId, crewId, sampleId = 0 }) => contract.invoke(
      'CoreSample_startSampling',
      [asteroidId, plotId, resourceId, sampleId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    ),
  },
  'FINISH_CORE_SAMPLE': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, resourceId, crewId, sampleId }) => contract.invoke(
      'CoreSample_finishSampling',
      [asteroidId, plotId, resourceId, sampleId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    ),
  },

  'PLAN_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ capableType, asteroidId, plotId, crewId }) => contract.invoke(
      'Construction_plan',
      [capableType, asteroidId, plotId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    )
  },
  'UNPLAN_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId }) => contract.invoke(
      'Construction_unplan',
      [asteroidId, plotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId }) => contract.invoke(
      'Construction_start',
      [asteroidId, plotId, crewId]
    ),
    isEqual: 'ALL'
  },
  'FINISH_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId }) => contract.invoke(
      'Construction_finish',
      [asteroidId, plotId, crewId]
    ),
    isEqual: 'ALL'
  },
  'DECONSTRUCT': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId }) => contract.invoke(
      'Construction_deconstruct',
      [asteroidId, plotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_EXTRACTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId }) => contract.invoke(
      'Extraction_start',
      [asteroidId, plotId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    )
  },
  'FINISH_EXTRACTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, plotId, crewId }) => contract.invoke(
      'Extraction_finish',
      [asteroidId, plotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_DELIVERY': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, originPlotId, originInvId, destPlotId, destInvId, resources, crewId }) => contract.invoke(
      'Inventory_transferStart',
      [asteroidId, originPlotId, originInvId, destPlotId, destInvId, Object.keys(resources), Object.values(resources), crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.originPlotId === vars.originPlotId
    )
  },
  'FINISH_DELIVERY': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, destPlotId, destInvId, deliveryId, crewId }) => contract.invoke(
      'Inventory_transferFinish',
      [asteroidId, destPlotId, destInvId, deliveryId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.destPlotId === vars.destPlotId
      && txVars.deliveryId === vars.deliveryId
    )
  }
});

const getNow = () => {
  return Math.floor(Date.now() / 1000);
}

export function ChainTransactionProvider({ children }) {
  const { walletContext: { starknet } } = useAuth();
  const { events, lastBlockNumber } = useEvents();
  const queryClient = useQueryClient();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchFailedTransaction = useStore(s => s.dispatchFailedTransaction);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const contracts = useMemo(() => {
    if (!!starknet?.account) {
      const processedContracts = {};
      const contractConfig = getContracts(starknet?.account, queryClient);
      Object.keys(contractConfig).forEach((k) => {
        const {
          address,
          config,
          transact,
          onConfirmed,
          onEventReceived,
          getConfirmedAlert,
          getEventAlert,
          confirms,
          isEqual
        } = contractConfig[k];
        processedContracts[k] = {
          execute: transact(new Contract(config, address, starknet.account)),
          onTransactionError: (err, vars) => {
            console.error(err, vars);
          },
          onEventReceived: (event, vars) => {
            if (getEventAlert) {
              createAlert(getEventAlert(vars));
            }
            onEventReceived && onEventReceived(event, vars);
          },
          onConfirmed: (event, vars) => {
            if (getConfirmedAlert) {
              createAlert(getConfirmedAlert(vars));
            }
            onConfirmed && onConfirmed(event, vars);
          },
          confirms: confirms || 1,
          isEqual
        };
      });
      return processedContracts;
    }
    return null;
  }, [createAlert, starknet?.account?.address, starknet?.account?.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const transactionWaiters = useRef([]);

  // TODO: in the future, may want to accomodate for user's clocks being wrong by
  //  passing back server time occasionally in websocket (maybe in headers?) and storing an offset
  const [chainTime, setChainTime] = useState(getNow());
  useInterval(() => setChainTime(getNow()), 1000);

  // on initial load, set provider.waitForTransaction for any pendingTransactions
  // so that we can throw any extension-related or timeout errors needed
  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      pendingTransactions.forEach(({ key, vars, txHash }) => {
        if (!txHash) return dispatchPendingTransactionComplete(txHash);
        if (!transactionWaiters.current.includes(txHash)) {
          transactionWaiters.current.push(txHash);

          // NOTE: waitForTransaction is slow -- often slower than server to receive and process
          //  event and send back to frontend... so we are using it just to listen for errors
          //  (events from backend will demonstrate success)
          starknet.provider.waitForTransaction(txHash, RETRY_INTERVAL)
            // .then((receipt) => {
            //   if (receipt) {
            //     console.log('transaction settled');
            //     contracts[key].onTransactionSuccess(receipt, vars);
            //     dispatchPendingTransactionUpdate(txHash, { txSettled: true, receipt });
            //   } else {
            //     contracts[key].onTransactionError('No transaction receipt generated.', vars);
            //     dispatchPendingTransactionComplete(txHash);
            //   }
            // })
            .catch((err) => {
              contracts[key].onTransactionError(err, vars);
              dispatchPendingTransactionComplete(txHash);
            })
            .finally(() => {
              // NOTE: keep this in "finally" so also performed on success (even though not handling success)
              transactionWaiters.current = transactionWaiters.current.filter((tx) => tx.txHash !== txHash);
            });
        }
      });
    }
  }, [contracts, pendingTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      const currentBlockNumber = lastBlockNumber + 1;

      pendingTransactions.forEach((tx) => {
        const { key, vars, txHash, txEvent } = tx;

        // if event had previously been received, just waiting for confirms
        if (txEvent && currentBlockNumber >= txEvent.blockNumber + contracts[key].confirms) {
          contracts[key].onConfirmed(txEvent, vars);
          dispatchPendingTransactionComplete(txHash);

        // else, check for event
        // TODO (enhancement): only need to check new events
        } else {
          const txHashBInt = BigInt(txHash);
          const txEvent = (events || []).find((e) => e.transactionHash && BigInt(e.transactionHash) === txHashBInt);
          if (txEvent) {
            contracts[key].onEventReceived(txEvent, vars);

            // if this event has already been confirmed, trigger completion too; else, just update status
            if (currentBlockNumber >= txEvent.blockNumber + contracts[key].confirms) {
              contracts[key].onConfirmed(txEvent, vars);
              dispatchPendingTransactionComplete(txHash);
            } else {
              dispatchPendingTransactionUpdate(txHash, { txEvent });
            }
          }
        }
      });
    }
  }, [events?.length, lastBlockNumber]);  // eslint-disable-line react-hooks/exhaustive-deps

  const execute = useCallback(async (key, vars) => {
    if (contracts && contracts[key]) {
      const { execute, onTransactionError } = contracts[key];
      try {
        const tx = await execute(vars);
        dispatchPendingTransaction({
          key,
          vars,
          txHash: tx.transaction_hash,
          waitingOn: 'TRANSACTION'
        });
      } catch (e) {
        if (e?.message !== 'User abort') {
          dispatchFailedTransaction({
            key,
            vars,
            err: e?.message || e
          });
        }
        onTransactionError(e, vars);
      }
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Account is disconnected or contract is invalid.',
        level: 'warning',
      });
    }
  }, [contracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPendingTx = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      return pendingTransactions.find((tx) => {
        if (tx.key === key) {
          if (contracts[key].isEqual === 'ALL') {
            return Object.keys(tx.vars).reduce((acc, k) => acc && tx.vars[k] === vars[k], true);
          } else if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return tx.vars?.i === vars?.i;
        }
        return false;
      });
    }
    return null;
  }, [contracts, pendingTransactions]);

  const getStatus = useCallback((key, vars) => {
    return getPendingTx(key, vars) ? 'pending' : 'ready';
  }, [getPendingTx]);

  return (
    <ChainTransactionContext.Provider value={{
      chainTime,
      execute,
      getStatus,
      getPendingTx
    }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
