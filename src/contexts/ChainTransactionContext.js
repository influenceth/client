import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useQueryClient } from 'react-query';
import { contracts as configs } from 'influence-utils';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';

const TIMEOUT = 600e3;  // 10 minutes

const ChainTransactionContext = createContext();

const getContracts = (queryClient) => ({
  'NAME_ASTEROID': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_NAMES,
    config: configs.AsteroidNames,
    transact: (contract) => ({ i, name }) => contract.setName(i, name),
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    }),
  },
  'BUY_ASTEROID': {
    address: process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
    config: configs.ArvadCrewSale,
    transact: (contract) => async ({ i }) => {
      const price = await contract.getAsteroidPrice(i);
      return contract.buyAsteroid(i, { value: price });
    },
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_BuyingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'BUY_ASTEROID_1ST_SALE': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_SALE,
    config: configs.AsteroidSale,
    transact: (contract) => async ({ i }) => {
      const price = await contract.getAsteroidPrice(i);
      return contract.buyAsteroid(i, { value: price });
    },
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_BuyingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'START_ASTEROID_SCAN': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
    config: configs.AsteroidScans,
    confirms: 3,
    transact: (contract) => ({ i }) => contract.startScan(i),
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_ScanningError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    }),
    getConfirmedAlert: ({ i }) => ({
      type: 'Asteroid_ReadyToFinalizeScan',
      i,
      timestamp: Math.round(Date.now() / 1000)
    }),
    onConfirmed: (event, { i }) => {
      queryClient.invalidateQueries('asteroids', i);
    }
  },
  'FINALIZE_ASTEROID_SCAN': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
    config: configs.AsteroidScans,
    transact: (contract) => ({ i }) => contract.finalizeScan(i),
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_FinalizeScanError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'SETTLE_CREW': {
    address: process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
    config: configs.ArvadCrewSale,
    transact: (contract) => ({ i }) => contract.mintCrewWithAsteroid(i),
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_SettlingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'NAME_CREW': {
    address: process.env.REACT_APP_CONTRACT_CREW_NAMES,
    config: configs.CrewNames,
    transact: (contract) => ({ i, name }) => contract.setName(i, name),
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
});

export function ChainTransactionProvider({ children }) {
  const { web3: { provider } } = useAuth();
  const queryClient = useQueryClient();
  const { events, lastBlockNumber } = useEvents();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const contracts = useMemo(() => {
    if (queryClient && provider) {
      const processedContracts = {};
      const contractConfig = getContracts(queryClient);
      Object.keys(contractConfig).forEach((k) => {
        const {
          address,
          config,
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
          execute: transact(new ethers.Contract(address, config, provider)),
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
  }, [createAlert, queryClient, provider]);

  const transactionWaiters = useRef([]);

  // on initial load, set provider.waitForTransaction for any pendingTransactions
  // so that we can throw any extension-related or timeout errors needed
  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      pendingTransactions.forEach(({ key, vars, txHash, timestamp }) => {
        if (!txHash) return dispatchPendingTransactionComplete(txHash);
        if (!transactionWaiters.current.includes(txHash)) {
          transactionWaiters.current.push(txHash);

          // NOTE: waitForTransaction is slow -- often slower than server to receive and process
          //  event and send back to frontend... so we are using it just to listen for errors
          //  (events from backend will demonstrate success)
          provider.provider.waitForTransaction(txHash, 1, TIMEOUT - (Date.now() - timestamp))
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
  }, [contracts, pendingTransactions, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      const currentBlockNumber = lastBlockNumber + 1;

      pendingTransactions.forEach((tx) => {
        const { key, vars, txHash, txEvent } = tx;

        // if event had previously been received, just waiting for confirms
        if (txEvent) {
          if (currentBlockNumber >= txEvent.blockNumber + contracts[key].confirms) {
            contracts[key].onConfirmed(txEvent, vars);
            dispatchPendingTransactionComplete(txHash);
          }

        // else, check for event
        // TODO (enhancement): only need to check new events
        } else {
          const newEvent = (events || []).find((e) => e.transactionHash === txHash);
          if (newEvent) {
            contracts[key].onEventReceived(newEvent, vars);

            // if this event has already been confirmed, trigger completion too
            if (currentBlockNumber >= newEvent.blockNumber + contracts[key].confirms) {
              contracts[key].onConfirmed(newEvent, vars);
              dispatchPendingTransactionComplete(txHash);

            // else, just update pending transaction with event record
            } else {
              dispatchPendingTransactionUpdate(txHash, { txEvent: newEvent });
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
          txHash: tx.hash,
          waitingOn: 'TRANSACTION'
        });
      } catch (e) {
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

  const getStatus = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      const isPending = !!pendingTransactions.find((tx) => {
        if (tx.key === key) {
          if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return tx.vars.i === vars.i;
        }
        return false;
      });
      return isPending ? 'pending' : 'ready';
    }
    return null;
  }, [contracts, pendingTransactions]);

  return (
    <ChainTransactionContext.Provider value={{ execute, getStatus }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
