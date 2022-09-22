import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { starknetContracts as configs } from 'influence-utils';
import { Contract, shortString } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';

const RETRY_INTERVAL = 5e3; // 5 seconds

const ChainTransactionContext = createContext();

const selectAccount = ({ account, sessionAccount }, selector) => {
  if (constants.DEFAULT_SESSION_POLICIES.find((c) => c.selector === selector)) {
    if (sessionAccount) {
      return sessionAccount;
    }
  }
  return account;
};

const contractConfig = {
  'PURCHASE_ASTEROID': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: ({ account }) => async ({ i }) => {
      const contract = new Contract(
        configs.Dispatcher,
        process.env.REACT_APP_STARKNET_DISPATCHER,
        account // NOTE: sessionAccount works fine here too
      );
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
    },
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_BuyingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'NAME_ASTEROID': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (accounts) => ({ i, name }) => {
      return selectAccount(accounts, 'Asteroid_setName').execute({
        contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
        entrypoint: 'Asteroid_setName',
        calldata: [
          i,
          shortString.encodeShortString(name)
        ]
      });
    },
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    }),
  },
  'SET_ACTIVE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    sessionEnabled: true,
    transact: (accounts) => ({ crew }) => {
      return selectAccount(accounts, 'Crewmate_setCrewComposition').execute({
        contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
        entrypoint: 'Crewmate_setCrewComposition',
        calldata: [
          crew.length,
          ...crew
        ]
      });
    },
    isEqual: () => true,
    getErrorAlert: () => ({
      type: 'GenericAlert',
      content: 'Crew reassignments failed.',
      level: 'warning',
    })
  },
  'PURCHASE_AND_INITIALIZE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: ({ account }) => async ({ name, features, traits }) => {
      const contract = new Contract(
        configs.Dispatcher,
        process.env.REACT_APP_STARKNET_DISPATCHER,
        account // NOTE: sessionAccount works fine here too
      );
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
          ]
        },
      ];

      return account.execute(calls);
    },
    isEqual: (txVars, vars) => txVars.sessionId === vars.sessionId,
    getErrorAlert: () => ({
      type: 'CrewMember_SettlingError',
      level: 'warning',
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'NAME_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    sessionEnabled: true,
    transact: (accounts) => ({ i, name }) => {
      return selectAccount(accounts, 'Crewmate_setName').execute({
        contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
        entrypoint: 'Crewmate_setName',
        calldata: [
          i,
          shortString.encodeShortString(name)
        ]
      });
    },
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },

  // 'START_ASTEROID_SCAN': {
  //   address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
  //   config: configs.AsteroidScans,
  //   confirms: 3,
  //   transact: ({ i }) => contract.startScan(i),
  //   getErrorAlert: ({ i }) => ({
  //     type: 'Asteroid_ScanningError',
  //     level: 'warning',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   }),
  //   getConfirmedAlert: ({ i }) => ({
  //     type: 'Asteroid_ReadyToFinalizeScan',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   }),
  //   onConfirmed: (event, { i }) => {
  //     queryClient.invalidateQueries('asteroids', i);
  //   }
  // },
  // 'FINALIZE_ASTEROID_SCAN': {
  //   address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
  //   config: configs.AsteroidScans,
  //   transact: ({ i }) => contract.finalizeScan(i),
  //   getErrorAlert: ({ i }) => ({
  //     type: 'Asteroid_FinalizeScanError',
  //     level: 'warning',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   })
  // },
  // 'SETTLE_CREW': {
  //   address: process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
  //   config: configs.ArvadCrewSale,
  //   transact: ({ i }) => contract.mintCrewWithAsteroid(i),
  //   getErrorAlert: ({ i }) => ({
  //     type: 'CrewMember_SettlingError',
  //     level: 'warning',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   })
  // },
};

export function ChainTransactionProvider({ children }) {
  const { wallet: { sessionAccount, starknet } } = useAuth();
  const { events, lastBlockNumber } = useEvents();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const [initiatedTransactions, setInitiatedTransactions] = useState([]);

  const initiateTransaction = useCallback((key, vars) => {
    setInitiatedTransactions((s) => [...s, { key, vars }]);
  }, []);

  const uninitiateTransaction = useCallback((key, vars) => {
    setInitiatedTransactions((s) => s.filter((tx) => {
      if (tx.key === key) {
        if (contracts[key].isEqual) {
          return !contracts[key].isEqual(tx.vars, vars);
        }
        return tx.vars.i !== vars.i;
      }
    }));
  }, []);

  const contracts = useMemo(() => {
    if (starknet?.account || sessionAccount) {
      const processedContracts = {};
      Object.keys(contractConfig).forEach((k) => {
        const {
          transact,
          onConfirmed,
          onEventReceived,
          getConfirmedAlert,
          getErrorAlert,
          getEventAlert,
          confirms,
          isEqual
        } = contractConfig[k];
        processedContracts[k] = {
          execute: transact({ account: starknet?.account, sessionAccount }),
          onTransactionError: (err, vars) => {
            console.error(err, vars);
            if (getErrorAlert) {
              createAlert(getErrorAlert(vars));
            }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createAlert, starknet?.account?.address, starknet?.account?.baseUrl, sessionAccount?.address]);

  const transactionWaiters = useRef([]);

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
        dispatchPendingTransactionComplete(txHash);

        // if event had previously been received, just waiting for confirms
        if (txEvent && currentBlockNumber >= txEvent.blockNumber + contracts[key].confirms) {
          contracts[key].onConfirmed(txEvent, vars);
          dispatchPendingTransactionComplete(txHash);

        // else, check for event
        // TODO (enhancement): only need to check new events
        } else {
          const txHashBInt = BigInt(txHash);
          const txEvent = (events || []).find((e) => BigInt(e.transactionHash) === txHashBInt);
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
        initiateTransaction(key, vars);
        const tx = await execute(vars);
        if (tx) {
          dispatchPendingTransaction({
            key,
            vars,
            txHash: tx.transaction_hash,
            waitingOn: 'TRANSACTION'
          });
          uninitiateTransaction(key, vars);
        }
      } catch (e) {
        onTransactionError(e, vars);
        uninitiateTransaction(key, vars);
      }
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Account is disconnected or contract is invalid.',
        level: 'warning',
      });
    }
  }, [contracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const getInitiatedTx = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      // check initiated (no tx hash yet)
      return initiatedTransactions.find((tx) => {
        if (tx.key === key) {
          if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return tx.vars.i === vars.i;
        }
      });
    }
    return null;
  }, [contracts, initiatedTransactions]);

  const getPendingTx = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      return pendingTransactions.find((tx) => {
        if (tx.key === key) {
          if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return tx.vars.i === vars.i;
        }
        return false;
      });
    }
    return null;
  }, [contracts, pendingTransactions]);

  const getStatus = useCallback((key, vars) => {
    if (getPendingTx(key, vars)) {
      return 'pending';
    // TODO: implement this
    //  - need to review all components looking specifically for 'pending' or pendingTx
    // } else if (getInitiatedTx(key, vars)) {
    //   return 'initiated';
    }
    return 'ready';
  }, [getInitiatedTx, getPendingTx]);

  return (
    <ChainTransactionContext.Provider value={{
      execute,
      getStatus,
      getInitiatedTx,
      getPendingTx
    }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
