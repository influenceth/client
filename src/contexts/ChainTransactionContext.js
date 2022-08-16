import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { starknetContracts as configs } from 'influence-utils';
import { Contract, shortString, uint256 } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';

const TIMEOUT = 600e3;  // 10 minutes

const ChainTransactionContext = createContext();

const getContracts = (account) => ({
  'NAME_ASTEROID': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ i, name }) => contract.invoke('Asteroid_setName', [
      uint256.bnToUint256(i),
      shortString.encodeShortString(name)
    ]),
    getErrorAlert: ({ i }) => ({
      type: 'Asteroid_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    }),
  },
  // 'BUY_ASTEROID': {
  //   address: process.env.REACT_APP_CONTRACT_ARVAD_CREW_SALE,
  //   config: configs.ArvadCrewSale,
  //   transact: (contract) => async ({ i, name }) => {
  //     const price = await contract.getAsteroidPrice(i);
  //     return contract.buyAsteroid(i, { value: price });
  //   },
  //   getErrorAlert: ({ i }) => ({
  //     type: 'Asteroid_BuyingError',
  //     level: 'warning',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   })
  // },
  // 'START_ASTEROID_SCAN': {
  //   address: process.env.REACT_APP_CONTRACT_ASTEROID_SCANS,
  //   config: configs.AsteroidScans,
  //   confirms: 3,
  //   transact: (contract) => ({ i }) => contract.startScan(i),
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
  //   transact: (contract) => ({ i }) => contract.finalizeScan(i),
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
  //   transact: (contract) => ({ i }) => contract.mintCrewWithAsteroid(i),
  //   getErrorAlert: ({ i }) => ({
  //     type: 'CrewMember_SettlingError',
  //     level: 'warning',
  //     i,
  //     timestamp: Math.round(Date.now() / 1000)
  //   })
  // },
  'SET_ACTIVE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ crew }) => {
      return contract.invoke(
        'Crewmate_setCrewComposition',
        [[...crew]]
      );
    },
    isEqual: () => true,
    getErrorAlert: () => ({
      // TODO: ...
    })
  },
  'PURCHASE_AND_INITIALIZE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => async ({ name, features, traits }) => {
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
    transact: (contract) => ({ i, name }) => contract.invoke(
      'Crewmate_setName',
      [
        uint256.bnToUint256(i),
        shortString.encodeShortString(name)
      ]
    ),
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_NamingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
});

export function ChainTransactionProvider({ children }) {
  const { wallet: { starknet } } = useAuth();
  const { events, lastBlockNumber } = useEvents();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const pendingTransactions = useStore(s => s.pendingTransactions);

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
          getErrorAlert,
          getEventAlert,
          confirms,
          isEqual
        } = contractConfig[k];
        processedContracts[k] = {
          execute: transact(new Contract(config, address, starknet.account)),
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
  }, [createAlert, starknet?.account?.address, starknet?.account?.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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
          starknet.provider.waitForTransaction(txHash, 1, TIMEOUT - (Date.now() - timestamp))
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
          const txEvent = (events || []).find((e) => e.transactionHash === txHash);
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
          if (contracts[key].isEqual) {
            return contracts[key].isEqual(tx.vars, vars);
          }
          return tx.vars.i === vars.i;
        }
      });
    }
    return null;
  }, [contracts, pendingTransactions]);

  const getStatus = useCallback((key, vars) => {
    return getPendingTx(key, vars) ? 'pending' : 'ready';
  }, [getPendingTx]);

  return (
    <ChainTransactionContext.Provider value={{
      execute,
      getStatus,
      getPendingTx
    }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
