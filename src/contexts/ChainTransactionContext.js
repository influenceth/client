import { createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { starknetContracts as configs } from 'influence-utils';
import { Contract, shortString, uint256 } from 'starknet';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';

const erc20abi = [
  {
      "members": [
          {
              "name": "low",
              "offset": 0,
              "type": "felt"
          },
          {
              "name": "high",
              "offset": 1,
              "type": "felt"
          }
      ],
      "name": "Uint256",
      "size": 2,
      "type": "struct"
  },
  {
      "data": [
          {
              "name": "from_",
              "type": "felt"
          },
          {
              "name": "to",
              "type": "felt"
          },
          {
              "name": "value",
              "type": "Uint256"
          }
      ],
      "keys": [],
      "name": "Transfer",
      "type": "event"
  },
  {
      "data": [
          {
              "name": "owner",
              "type": "felt"
          },
          {
              "name": "spender",
              "type": "felt"
          },
          {
              "name": "value",
              "type": "Uint256"
          }
      ],
      "keys": [],
      "name": "Approval",
      "type": "event"
  },
  {
      "data": [
          {
              "name": "previousOwner",
              "type": "felt"
          },
          {
              "name": "newOwner",
              "type": "felt"
          }
      ],
      "keys": [],
      "name": "OwnershipTransferred",
      "type": "event"
  },
  {
      "inputs": [
          {
              "name": "name",
              "type": "felt"
          },
          {
              "name": "symbol",
              "type": "felt"
          },
          {
              "name": "decimals",
              "type": "felt"
          },
          {
              "name": "initial_supply",
              "type": "Uint256"
          },
          {
              "name": "recipient",
              "type": "felt"
          },
          {
              "name": "owner",
              "type": "felt"
          }
      ],
      "name": "constructor",
      "outputs": [],
      "type": "constructor"
  },
  {
      "inputs": [],
      "name": "name",
      "outputs": [
          {
              "name": "name",
              "type": "felt"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "symbol",
      "outputs": [
          {
              "name": "symbol",
              "type": "felt"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
          {
              "name": "totalSupply",
              "type": "Uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "decimals",
      "outputs": [
          {
              "name": "decimals",
              "type": "felt"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "account",
              "type": "felt"
          }
      ],
      "name": "balanceOf",
      "outputs": [
          {
              "name": "balance",
              "type": "Uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "owner",
              "type": "felt"
          },
          {
              "name": "spender",
              "type": "felt"
          }
      ],
      "name": "allowance",
      "outputs": [
          {
              "name": "remaining",
              "type": "Uint256"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [],
      "name": "owner",
      "outputs": [
          {
              "name": "owner",
              "type": "felt"
          }
      ],
      "stateMutability": "view",
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "recipient",
              "type": "felt"
          },
          {
              "name": "amount",
              "type": "Uint256"
          }
      ],
      "name": "transfer",
      "outputs": [
          {
              "name": "success",
              "type": "felt"
          }
      ],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "sender",
              "type": "felt"
          },
          {
              "name": "recipient",
              "type": "felt"
          },
          {
              "name": "amount",
              "type": "Uint256"
          }
      ],
      "name": "transferFrom",
      "outputs": [
          {
              "name": "success",
              "type": "felt"
          }
      ],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "spender",
              "type": "felt"
          },
          {
              "name": "amount",
              "type": "Uint256"
          }
      ],
      "name": "approve",
      "outputs": [
          {
              "name": "success",
              "type": "felt"
          }
      ],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "spender",
              "type": "felt"
          },
          {
              "name": "added_value",
              "type": "Uint256"
          }
      ],
      "name": "increaseAllowance",
      "outputs": [
          {
              "name": "success",
              "type": "felt"
          }
      ],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "spender",
              "type": "felt"
          },
          {
              "name": "subtracted_value",
              "type": "Uint256"
          }
      ],
      "name": "decreaseAllowance",
      "outputs": [
          {
              "name": "success",
              "type": "felt"
          }
      ],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "to",
              "type": "felt"
          },
          {
              "name": "amount",
              "type": "Uint256"
          }
      ],
      "name": "mint",
      "outputs": [],
      "type": "function"
  },
  {
      "inputs": [
          {
              "name": "newOwner",
              "type": "felt"
          }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "type": "function"
  },
  {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "type": "function"
  }
]

const TIMEOUT = 600e3;  // 10 minutes

const ChainTransactionContext = createContext();

const toId = (input) => typeof input === 'object' ? input.id : input;

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
  'SET_CREW_COMPOSITION': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ crew }) => contract.invoke(
      'Crewmate_setCrewComposition',
      [
        crew.map(({ i }) => i)
      ]
    ),
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_SettlingError',
      level: 'warning',
      i,
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  'PURCHASE_AND_INITIALIZE_CREW': {
    address: process.env.REACT_APP_STARKNET_DISPATCHER,
    config: configs.Dispatcher,
    transact: (contract) => ({ amount, name, features, traits }) => {
      const price = uint256.bnToUint256(amount);
      const calls = [
        {
          contractAddress: '0x62230ea046a9a5fbc261ac77d03c8d41e5d442db2284587570ab46455fd2488',
          entrypoint: 'approve',
          calldata: [
            process.env.REACT_APP_STARKNET_DISPATCHER,
            ...Object.values(price)
          ]
        },
        {
          contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
          entrypoint: 'Crewmate_purchaseAndInitializeAdalian',
          calldata: [
            ...Object.values(price),
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
    getErrorAlert: ({ i }) => ({
      type: 'CrewMember_SettlingError',
      level: 'warning',
      timestamp: Math.round(Date.now() / 1000)
    })
  },
  // TODO: ...
  // 'INITIALIZE_CREW': {
  //   address: process.env.REACT_APP_STARKNET_DISPATCHER,
  //   config: configs.Dispatcher,
  //   transact: (contract) => ({ name, features, traits }) => {
  //     const call = {
  //       contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  //       entrypoint: 'Crewmate_initializeAdalian',
  //       calldata: [
  //         // TODO: need a token id, right?
  //         shortString.encodeShortString(name),
  //         '11', // array len v
  //         ...[
  //           features.crewCollection,
  //           features.sex,
  //           features.body,
  //           features.crewClass,
  //           features.title,
  //           features.outfit,
  //           features.hair,
  //           features.facialFeature,
  //           features.hairColor,
  //           features.headPiece,
  //           features.bonusItem,
  //         ].map((x) => x.toString()),
  //         '4', // array len v
  //         ...[
  //           traits.drive,
  //           traits.classImpactful,
  //           traits.driveCosmetic,
  //           traits.cosmetic,
  //         ].map((t) => t.id.toString()),
  //       ]
  //     };

  //     return account.execute(calls);
  // },
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
    <ChainTransactionContext.Provider value={{ execute, getStatus, getPendingTx }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
