import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { starknetContracts as configs } from '@influenceth/sdk';
import { Contract, shortString } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

// TODO: now that all are on dispatcher, could probably collapse a lot of redundant code in getContracts
const getContracts = (account) => ({
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
    isEqual: (txVars, vars) => txVars.i === vars.i
  },
  'FINISH_ASTEROID_SCAN': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i }) => contract.invoke('Asteroid_finishScan', [i]),
  },
  'SET_ACTIVE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ crewId, crewmates }) => {
      if (crewId) {
        return contract.invoke(
          'Crew_setComposition',
          [
            crewId,
            [...crewmates]
          ]
        );
      } else {
        return contract.invoke(
          'Crew_mint',
          [
            [...crewmates]
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
    transact: (contract) => ({ asteroidId, lotId, resourceId, crewId, sampleId = 0 }) => contract.invoke(
      'CoreSample_startSampling',
      [asteroidId, lotId, resourceId, sampleId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.lotId === vars.lotId
      && txVars.crewId === vars.crewId
    ),
  },
  'FINISH_CORE_SAMPLE': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, resourceId, crewId, sampleId }) => contract.invoke(
      'CoreSample_finishSampling',
      [asteroidId, lotId, resourceId, sampleId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.lotId === vars.lotId
      && txVars.crewId === vars.crewId
    ),
  },

  'PLAN_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ buildingType, asteroidId, lotId, crewId }) => contract.invoke(
      'Construction_plan',
      [buildingType, asteroidId, lotId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.lotId === vars.lotId
      && txVars.crewId === vars.crewId
    )
  },
  'UNPLAN_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
      'Construction_unplan',
      [asteroidId, lotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
      'Construction_start',
      [asteroidId, lotId, crewId]
    ),
    isEqual: 'ALL'
  },
  'FINISH_CONSTRUCTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
      'Construction_finish',
      [asteroidId, lotId, crewId]
    ),
    isEqual: 'ALL'
  },
  'DECONSTRUCT': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
      'Construction_deconstruct',
      [asteroidId, lotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_EXTRACTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId }) => contract.invoke(
      'Extraction_start',
      [asteroidId, lotId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.lotId === vars.lotId
      && txVars.crewId === vars.crewId
    )
  },
  'FINISH_EXTRACTION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
      'Extraction_finish',
      [asteroidId, lotId, crewId]
    ),
    isEqual: 'ALL'
  },

  'START_DELIVERY': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, originLotId, originInvId, destLotId, destInvId, resources, crewId }) => contract.invoke(
      'Inventory_transferStart',
      [asteroidId, originLotId, originInvId, destLotId, destInvId, Object.keys(resources), Object.values(resources), crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.originLotId === vars.originLotId
    )
  },
  'FINISH_DELIVERY': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ asteroidId, destLotId, destInvId, deliveryId, crewId }) => contract.invoke(
      'Inventory_transferFinish',
      [asteroidId, destLotId, destInvId, deliveryId, crewId]
    ),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.destLotId === vars.destLotId
      && txVars.deliveryId === vars.deliveryId
    )
  }
});

const getNow = () => {
  return Math.floor(Date.now() / 1000);
}

export function ChainTransactionProvider({ children }) {
  const { account, walletContext: { starknet } } = useAuth();
  const { events, lastBlockNumber } = useEvents();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchFailedTransaction = useStore(s => s.dispatchFailedTransaction);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const dispatchClearTransactionHistory = useStore(s => s.dispatchClearTransactionHistory);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const [promptingTransaction, setPromptingTransaction] = useState(false);

  const contracts = useMemo(() => {
    if (!!starknet?.account) {
      const processedContracts = {};
      const contractConfig = getContracts(starknet?.account);
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

  // on logout, clear pending (and failed) transactions
  useEffect(() => {
    if (!account) dispatchClearTransactionHistory();
  }, [!account, dispatchClearTransactionHistory]);

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

  const lastBlockNumberHandled = useRef(lastBlockNumber);
  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      const currentBlockNumber = lastBlockNumber + 1;

      pendingTransactions.forEach((tx) => {
        const { key, vars, txHash, txEvent } = tx;

        // if event had previously been received, just waiting for confirms
        // TODO: can we safely deprecate confirms? should it always be 1? 0?
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

          // TODO: fix below
          //  - cartridge needs to respond to getTransactionReceipt more appropriately
          //    (seems like always returning "Transaction hash not found"; at most should do that for REJECTED txs)
          //  - move this into its own effect dependent only on block number changes so not running getTransactionReceipt so often

          // // if pending transaction has not turned into an event within 45 seconds
          // // check every useEffect loop if tx is rejected (or missing)
          // } else if (lastBlockNumber > lastBlockNumberHandled.current) {
          //   if (chainTime > Math.floor(tx.timestamp / 1000) + 180) { // TODO: lower this
          //     starknet.provider.getTransactionReceipt(txHash)
          //       .then((receipt) => {
          //         console.info(`RECEIPT for tx ${txHash}`, receipt);  // TODO: remove this
          //         if (receipt && receipt.status === 'REJECTED') {
          //           dispatchPendingTransactionComplete(txHash);
          //           dispatchFailedTransaction({
          //             key,
          //             vars,
          //             txHash,
          //             err: receipt.status_data || 'Transaction was rejected.'
          //           });
          //         }
          //       })
          //       .catch((err) => {
          //         console.warn(err);
          //         if (err?.message.includes('Transaction hash not found')) {
          //           dispatchPendingTransactionComplete(txHash);
          //           dispatchFailedTransaction({
          //             key,
          //             vars,
          //             txHash,
          //             err: 'Transaction was rejected.'
          //           });
          //         }
          //       });
          //   }
          }
        }
      });
    }
    lastBlockNumberHandled.current = lastBlockNumber;
  }, [events?.length, lastBlockNumber]);  // eslint-disable-line react-hooks/exhaustive-deps

  const execute = useCallback(async (key, vars) => {
    if (contracts && contracts[key]) {
      const { execute, onTransactionError } = contracts[key];

      // TODO: will need to sort this out when argentX implements session wallets, but
      //  currently in non-session wallet, argentX does not return from the `await execute`
      //  below when their user prompt is closed instead of rejected (the user has to
      //  reopen the prompt and reject it to get out of here)
      setPromptingTransaction(true);
      try {
        const tx = await execute(vars);
        dispatchPendingTransaction({
          key,
          vars,
          txHash: tx.transaction_hash,
          waitingOn: 'TRANSACTION'
        });
      } catch (e) {
        // TODO: in Braavos, get "Execute failed" when decline (but it's unclear if that is just their generic error)
        // ("User abort" is argent, "Canceled" is Cartridge)
        if (!['User abort', 'Canceled'].includes(e?.message)) {
          dispatchFailedTransaction({
            key,
            vars,
            txHash: null,
            err: e?.message || e
          });
        }
        onTransactionError(e, vars);
      }
      setPromptingTransaction(false);
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
      getPendingTx,
      promptingTransaction
    }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
