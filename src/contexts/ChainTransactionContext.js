import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { starknetContracts as configs } from '@influenceth/sdk';
import { Contract, Provider, shortString } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

// doing this b/c currently starknet's provider doesn't work for provider.getTransaction/getTransactionReceipt
const genericProvider = new Provider({ sequencer: { baseUrl: process.env.REACT_APP_STARKNET_NETWORK } });

// TODO: now that all are on dispatcher, could probably collapse a lot of redundant code in getContracts
const contractConfig = {
  'PURCHASE_ASTEROID': {
    getPrefetcher: ({ i }) => ({
      contractName: 'Dispatcher',
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'AsteroidSale_getPrice',
      calldata: [i]
    }),
    getTransaction: ({ i }, { price }) => {
      const priceParts = Object.values(price).map((part) => BigInt(part).toString());
      return [
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
        }
      ];
    },
  },
  'NAME_ASTEROID': {
    getTransaction: ({ i, name }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Asteroid_setName',
      calldata: [
        i,
        shortString.encodeShortString(name)
      ]
    })
  },
  'START_ASTEROID_SCAN': {
    getTransaction: ({ i, boost, _packed, _proofs }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Asteroid_startScan',
      calldata: [
        i,
        _packed.features,
        _proofs.features.length, // array len v
        ..._proofs.features,
        boost,
        _packed.bonuses,
        _proofs.boostBonus.length, // array len v
        ..._proofs.boostBonus,
      ]
    }),
    isEqual: (txVars, vars) => txVars.i === vars.i
  },
  'FINISH_ASTEROID_SCAN': {
    getTransaction: ({ i }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Asteroid_finishScan',
      calldata: [i]
    }),
  },
  'SET_ACTIVE_CREW': {
    getTransaction: ({ crewId, crewMembers }) => {
      if (crewId) {
        return {
          contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
          entrypoint: 'Crew_setComposition',
          calldata: [
            crewId,
            crewMembers.length, // array len v
            ...crewMembers
          ]
        };
      } else {
        return {
          contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
          entrypoint: 'Crew_mint',
          calldata: [
            crewMembers.length, // array len v
            ...crewMembers
          ]
        };
      }
    },
    isEqual: () => true,
  },
  // // NOTE: this is just for debugging vvv
  // 'PURCHASE_UNINITIALIZED_CREWMATE': {
  //   getPrefetcher: () => ({
  //     contractName: 'Dispatcher',
  //     contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  //     entrypoint: 'CrewmateSale_getPrice',
  //   }),
  //   getTransaction: ({}, { price }) => {
  //     const priceParts = Object.values(price).map((part) => BigInt(part).toString());
  //     return [
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
  //           ...priceParts
  //         ]
  //       }
  //     ];
  //   },
  //   isEqual: () => true,
  // },
  // // ^^^
  'INITIALIZE_CREWMATE': {
    getTransaction: ({ i, name, features, traits, crewId = 0 }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Crewmate_initializeAdalian',
      calldata: [
        i,
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
        crewId
      ]
    }),
    isEqual: (vars, txVars) => vars.i === txVars.i,
  },
  'PURCHASE_AND_INITIALIZE_CREWMATE': {
    getPrefetcher: () => ({
      contractName: 'Dispatcher',
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'CrewmateSale_getPrice',
    }),
    getTransaction: ({ name, features, traits, crewId }, { price }) => {
      const priceParts = Object.values(price).map((part) => BigInt(part).toString());
      return [
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
    },
    isEqual: () => true,
  },
  'NAME_CREWMATE': {
    getTransaction: ({ i, name }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Crewmate_setName',
      calldata: [
        i,
        shortString.encodeShortString(name)
      ]
    }),
  },
  'START_CORE_SAMPLE': {
    getTransaction: ({ asteroidId, plotId, resourceId, crewId, sampleId = 0 }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'CoreSample_startSampling',
      calldata: [asteroidId, plotId, resourceId, sampleId, crewId]
    }),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    ),
  },
  'FINISH_CORE_SAMPLE': {
    getTransaction: ({ asteroidId, plotId, resourceId, crewId, sampleId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'CoreSample_finishSampling',
      calldata: [asteroidId, plotId, resourceId, sampleId, crewId]
    }),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    ),
  },
  'PLAN_CONSTRUCTION': {
    getTransaction: ({ capableType, asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Construction_plan',
      calldata: [capableType, asteroidId, plotId, crewId]
    }),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    )
  },
  'UNPLAN_CONSTRUCTION': {
    getTransaction: ({ asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Construction_unplan',
      calldata: [asteroidId, plotId, crewId]
    }),
    isEqual: 'ALL'
  },
  'START_CONSTRUCTION': {
    getTransaction: ({ asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Construction_start',
      calldata: [asteroidId, plotId, crewId]
    }),
    isEqual: 'ALL'
  },
  'FINISH_CONSTRUCTION': {
    getTransaction: ({ asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Construction_finish',
      calldata: [asteroidId, plotId, crewId]
    }),
    isEqual: 'ALL'
  },
  'DECONSTRUCT': {
    getTransaction: ({ asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Construction_deconstruct',
      calldata: [asteroidId, plotId, crewId]
    }),
    isEqual: 'ALL'
  },
  'START_EXTRACTION': {
    getTransaction: ({ asteroidId, plotId, crewId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Extraction_start',
      calldata: [asteroidId, plotId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId, crewId]
    }),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.plotId === vars.plotId
      && txVars.crewId === vars.crewId
    )
  },
  'FINISH_EXTRACTION': {
    getTransaction: ({ asteroidId, plotId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Extraction_finish',
      calldata: [asteroidId, plotId, crewId]
    }),
    isEqual: 'ALL'
  },
  'START_DELIVERY': {
    getTransaction: ({ asteroidId, originPlotId, originInvId, destPlotId, destInvId, resources, crewId }) => {
      const resourceArrayLen = Object.keys(resources).length;
      return {
        contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
        entrypoint: 'Inventory_transferStart',
        calldata: [
          asteroidId,
          originPlotId,
          originInvId,
          destPlotId,
          destInvId,
          resourceArrayLen, // array len v
          ...Object.keys(resources),
          resourceArrayLen, // array len v
          ...Object.values(resources),
          crewId
        ]
      }
    },
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.originPlotId === vars.originPlotId
    )
  },
  'FINISH_DELIVERY': {
    getTransaction: ({ asteroidId, destPlotId, destInvId, deliveryId, crewId }) => ({
      contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
      entrypoint: 'Inventory_transferFinish',
      calldata: [asteroidId, destPlotId, destInvId, deliveryId, crewId]
    }),
    isEqual: (txVars, vars) => (
      txVars.asteroidId === vars.asteroidId
      && txVars.crewId === vars.crewId
      && txVars.destPlotId === vars.destPlotId
      && txVars.deliveryId === vars.deliveryId
    )
  }
};

const getNow = () => {
  return Math.floor(Date.now() / 1000);
}

export function ChainTransactionProvider({ children }) {
  const { account, walletContext: { session, starknet } } = useAuth();
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
      Object.keys(contractConfig).forEach((k) => {
        const {
          getPrefetcher,
          getTransaction,
          onConfirmed,
          onEventReceived,
          getConfirmedAlert,
          getEventAlert,
          confirms,
          isEqual
        } = contractConfig[k];
        processedContracts[k] = {
          execute: async (vars) => {
            let prefetchParams;
            if (getPrefetcher) {
              const prefetcher = getPrefetcher(vars);
              const contract = new Contract(
                configs[prefetcher.contractName],
                prefetcher.contractAddress,
                starknet.account // doesn't matter which account here
              )
              prefetchParams = await contract.call(prefetcher.entrypoint, prefetcher.calldata || []);
            }

            let transactionCalls = getTransaction(vars, prefetchParams || {});
            if (!Array.isArray(transactionCalls)) transactionCalls = [transactionCalls];

            // if there is a session wallet available and all calls are session approved,
            // then user the session wallet account; else, use the normal account
            let selectedAccount = starknet.account;
            if (session.account) {
              const allCallsAreAllowedInSession = !transactionCalls.find((c) => !session.account.signedSession.policies.find(
                (p) => c.contractAddress === p.contractAddress && c.entrypoint === p.selector
              ));

              // if all calls are session approved
              if (allCallsAreAllowedInSession) {
                selectedAccount = session.account;
              }
            }

            // execute against the intended account
            return selectedAccount.execute(transactionCalls.length === 1 ? transactionCalls[0] : transactionCalls);
          },
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
  }, [createAlert, starknet?.account?.address, starknet?.account?.baseUrl, session?.account]); // eslint-disable-line react-hooks/exhaustive-deps

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
          }
        }
      });
    }
  }, [events?.length, lastBlockNumber]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      pendingTransactions.filter((tx) => !tx.txEvent).forEach((tx) => {
        // if it's been 45+ seconds, start checking on each block if has been rejected (or missing)
        if (chainTime > Math.floor(tx.timestamp / 1000) + 45) {
          const { key, vars, txHash } = tx;

          genericProvider.getTransactionReceipt(txHash)
            .then((receipt) => {
              console.info(`RECEIPT for tx ${txHash}`, receipt);  // TODO: remove this
              if (receipt && receipt.status === 'REJECTED') {
                dispatchPendingTransactionComplete(txHash);
                dispatchFailedTransaction({
                  key,
                  vars,
                  txHash,
                  err: receipt.status_data || 'Transaction was rejected.'
                });
              }
            })
            .catch((err) => {
              console.warn(err);
            });
        }
      });
    }
  }, [lastBlockNumber])



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
