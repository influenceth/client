import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { ethers } from 'ethers';
import { useQueryClient } from 'react-query';
import { contracts as configs } from 'influence-utils';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const TIMEOUT = 600e3;  // 10 minutes

const ChainTransactionContext = createContext();

const getContracts = (queryClient) => ({
  'NAME_ASTEROID': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_NAMES,
    config: configs.AsteroidNames,
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => ({ i, name }) => contract.setName(i, name),
    onSuccess: (receipt, { i, name }) => {
      // TODO: update asteroids, owned asteroids, specific asteroid
      queryClient.invalidateQueries('asteroid', i);
      queryClient.invalidateQueries('events');
    },
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'BUY_ASTEROID': {
    address: process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
    config: configs.ArvadCrewSale,
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => async ({ i, name }) => {
      const price = await contract.getAsteroidPrice(i);
      return contract.buyAsteroid(i, { value: price });
    },
    onSuccess: (receipt, { i, name }) => {
      // TODO: ...
      queryClient.invalidateQueries('events');
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
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => ({ i }) => contract.startScan(i),
    onSuccess: (receipt, { i }) => {
      queryClient.invalidateQueries('events');
    },
    getSuccessAlert: (receipt, { i }) => ({
      type: 'Asteroid_ReadyToFinalizeScan',
      i: i,
      timestamp: Math.round(Date.now() / 1000)
    }),
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_ScanningError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'FINALIZE_ASTEROID_SCAN': {
    address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
    config: configs.AsteroidScans,
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => ({ i }) => contract.finalizeScan(i),
    onSuccess: (receipt, { i }) => {
      // TODO: ...
      queryClient.invalidateQueries('events');
    },
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
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => ({ i }) => contract.mintCrewWithAsteroid(i),
    onSuccess: (receipt, { i }) => {
      // TODO: ...
      queryClient.invalidateQueries('assignments');
      queryClient.invalidateQueries('events');
    },
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
    isEqual: (varsA, varsB) => varsA.i === varsB.i,
    transact: (contract) => ({ i, name }) => contract.setName(i, name),
    onSuccess: (receipt, { i, name }) => {
      // TODO: ...
      queryClient.invalidateQueries('events');
    },
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

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionSettled = useStore(s => s.dispatchPendingTransactionSettled);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const contracts = useMemo(() => {
    if (queryClient && provider) {
      const processedContracts = {};
      const contractConfig = getContracts(queryClient);
      Object.keys(contractConfig).forEach((k) => {
        const { address, config, transact, onSuccess, getSuccessAlert, getErrorAlert, isEqual } = contractConfig[k];
        processedContracts[k] = {
          execute: transact(new ethers.Contract(address, config, provider)),
          onSuccess: (receipt, vars) => {
            setTimeout(() => {
              if (getSuccessAlert) {
                createAlert(getSuccessAlert(receipt, vars));
              }
              onSuccess(receipt, vars);
            }, 1000);
          },
          onError: (err, vars) => {
            console.error(err, vars);
            if (getErrorAlert) {
              createAlert(getErrorAlert(vars));
            }
          },
          isEqual
        };
      });
      return processedContracts;
    }
    return null;
  }, [createAlert, queryClient, provider]);

  const waitingTxs = useRef([]);
  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      console.log('pending transactions', pendingTransactions);
      pendingTransactions.forEach(({ key, vars, txHash, timestamp }) => {
        if (!txHash) return dispatchPendingTransactionSettled(txHash);
        if (!waitingTxs.current.includes(txHash)) {
          waitingTxs.current.push(txHash);
          // TODO: test timeout
          console.log('waitForTransaction', provider, txHash, 1, TIMEOUT - (Date.now() - timestamp) );
          provider.provider.waitForTransaction(txHash, 1, TIMEOUT - (Date.now() - timestamp))
            .then((receipt) => {
              console.log('then', txHash, receipt, vars);
              if (receipt) {
                contracts[key].onSuccess(receipt, vars);
              } else {
                contracts[key].onError('No transaction receipt generated.', vars);
              }
            })
            .catch((err) => {
              console.log('catch', err, vars);
              contracts[key].onError(err, vars);
            })
            .finally(() => {
              console.log('finally', vars);
              dispatchPendingTransactionSettled(txHash);
              waitingTxs.current = waitingTxs.current.filter((tx) => tx.txHash !== txHash);
            });
          console.log('after', txHash);
        }
      });
    }
  }, [contracts, pendingTransactions, provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute = useCallback(async (key, vars) => {
    if (contracts && contracts[key]) {
      const { execute, onError } = contracts[key];
      try {
        console.log('vars', vars);
        const tx = await execute(vars);
        console.log('tx', tx);
        dispatchPendingTransaction({ key, vars, txHash: tx.hash });
        // TODO: can add a handler for optimistic update
      } catch (e) {
        onError(e, vars);
      }
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Account is disconnected or contract is invalid.',
        level: 'warning',
      });
    }
  }, [contracts]); // eslint-disable-line react-hooks/exhaustive-deps

  // TODO: status should be 'submitting', 'confirming', and 'ready'
  //      (i.e. for pre-tx delay, post-tx wait, and complete)
  const getStatus = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      const pending = !!pendingTransactions.find((tx) => tx.key === key && contracts[key].isEqual(tx.vars, vars));
      return pending ? 'pending' : 'ready';
    }
    return null;
  }, [contracts, pendingTransactions]);

  // TODO: would it be better to watch for txnHash or blockNumber in events?

  return (
    <ChainTransactionContext.Provider value={{ execute, getStatus }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
