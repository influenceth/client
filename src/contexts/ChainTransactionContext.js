import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, System } from '@influenceth/sdk';
import { utils as ethersUtils } from 'ethers';
import { isEqual, get } from 'lodash';

import useActivitiesContext from '~/hooks/useActivitiesContext';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';
import api from '~/lib/api';




import { CallData, uint256 } from 'starknet';
const Systems = System.Systems;


const formatCalldataValue = (type, value) => {
  console.log('formatCalldataValue', type, value);
  if (type === 'ContractAddress') {
    return value;
  }
  else if (type === 'Entity') {
    return [value.label, value.id];
  }
  else if (type === 'Number') {
    return Number(value);
  }
  else if (type === 'String') {
    return value;
  }
  else if (type === 'BigNumber') {
    return BigInt(value);
  }
  else if (type === 'Ether') {
    return uint256.bnToUint256(value);
  }
  else if (type === 'InventoryItem') {
    return [value.product, value.amount];
  }
  else {
    return value?.product ? [value.product, value.amount] : value;
  }
};

// this is specific to the system's calldata format (i.e. not the full calldata of execute())
const formatSystemCalldata = (name, vars) => {
  console.log('formatSystemCalldata', { name, vars });
  const system = Systems[name];
  if (!system) throw new Error(`Unknown system: ${name}`);

  const x = system.inputs.reduce((acc, { name, type, isArray }) => {
    if (isArray) acc.push(vars[name]?.length || 0);
    (isArray ? vars[name] : [vars[name]]).forEach((v) => {
      const formattedVar = formatCalldataValue(type, v);
      try {
        (Array.isArray(formattedVar) ? formattedVar : [formattedVar]).forEach((val) => {
          acc.push(val);
        });
      } catch (e) {
        console.error(`${name} could not be formatted`, vars[name], e);
      }
    }, []);
    return acc;
  }, []);
  console.log('formatSystemCalldata (out)', x);
  return x;
};

const getRunSystemCall = (name, input, dispatcherAddress) => {
  console.log('getRunSystemCall', { name, input, dispatcherAddress });
  return {
    contractAddress: dispatcherAddress,
    entrypoint: 'run_system',
    calldata: CallData.compile({
      name,
      calldata: formatSystemCalldata(name, input)
    }),
  };
};


///////////

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

const getNow = () => Math.floor(Date.now() / 1000);

// TODO: equalityTest default of 'i' doesn't make sense anymore

console.log('System', System);

// TODO: move systems into their own util file (like activities)

// x ConstructionAbandon
// x ConstructionDeconstruct
// x ConstructionFinish
// x ConstructionPlan
// x ConstructionStart
// SampleDepositFinish
// SampleDepositImprove
// SampleDepositStart

// supported configs:
//  confirms, equalityTest
const customConfigs = {
  // customization of Systems configs from sdk
  ArrangeCrew: { equalityTest: ['callerCrew.id'] }, // TODO: should this be caller_crew?
  ChangeName: { equalityTest: ['entity.id', 'entity.label'] },

  ConstructionAbandon: { equalityTest: ['building.id'] },
  ConstructionDeconstruct: { equalityTest: ['building.id'] },
  ConstructionFinish: { equalityTest: ['building.id'] },
  ConstructionPlan: { equalityTest: ['lot.id'] },
  ConstructionStart: { equalityTest: ['building.id'] },

  SampleDepositFinish: { equalityTest: ['lot.id', 'caller_crew.id'] },
  SampleDepositImprove: { equalityTest: ['lot.id', 'caller_crew.id'] },
  SampleDepositStart: { equalityTest: ['lot.id', 'caller_crew.id'] },

  ExchangeCrew: { equalityTest: true },
  InitializeAsteroid: {
    preprocess: ({ asteroid }) => ({
      asteroid,
      celestial_type: BigInt(asteroid.Celestial.celestialType),
      mass: BigInt(Math.round(Asteroid.Entity.getMass(asteroid))) * 2n ** 64n,
      radius: BigInt(Math.round(asteroid.Celestial.radius * 1000)) * 2n ** 32n / 1000n,
      a: BigInt(Math.round(asteroid.Orbit.a * 10000)) * 2n ** 64n / 10000n,
      ecc: BigInt(Math.round(asteroid.Orbit.ecc * 1000)) * 2n ** 64n / 1000n,
      inc: BigInt(asteroid.Orbit.inc * 2 ** 64),
      raan: BigInt(asteroid.Orbit.raan * 2 ** 64),
      argp: BigInt(asteroid.Orbit.argp * 2 ** 64),
      m: BigInt(asteroid.Orbit.m * 2 ** 64),
      purchase_order: asteroid.Celestial.purchaseOrder,
      scan_status: asteroid.Celestial.scanStatus,
      bonuses: asteroid.Celestial.bonuses,
      merkle_proof: asteroid.AsteroidProof?.proof || []
    }),
    equalityTest: ['asteroid.id']
  },
  ManageAsteroid: { equalityTest: ['asteroid.id'] },
  PurchaseAdalian: {
    getPrice: async () => {
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return BigInt(ADALIAN_PRICE_ETH);
    },
    equalityTest: true
  },
  PurchaseAsteroid: {
    getPrice: async ({ asteroid }) => {
      const { ASTEROID_BASE_PRICE_ETH, ASTEROID_LOT_PRICE_ETH } = await api.getConstants([
        'ASTEROID_BASE_PRICE_ETH',
        'ASTEROID_LOT_PRICE_ETH'
      ]);
      const base = BigInt(ASTEROID_BASE_PRICE_ETH);
      const lot = BigInt(ASTEROID_LOT_PRICE_ETH);
      return base + lot * BigInt(Asteroid.Entity.getSurfaceArea(asteroid));
    },
    equalityTest: ['asteroid.id']
  },
  InitializeArvadian: { equalityTest: true },
  RecruitAdalian: {
    getPrice: async ({ crewmate }) => {
      if (crewmate?.id > 0) return 0n; // if recruiting existing crewmate, no cost
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return BigInt(ADALIAN_PRICE_ETH);
    },
    equalityTest: true
  },

  // virtual multi-system wrappers
  // TODO: could do fancier conditional multisystems if that would help
  // i.e. `multisystemCalls: [{ name: 'InitializeAsteroid', cond: (a) => !a.AsteroidProof.used }, 'ScanAsteroid'],`

  BulkPurchaseAdalians: {
    bulkSystemCall: 'PurchaseAdalian',
    getRepeatTally: (vars) => Math.max(1, Math.floor(vars.tally)),
    equalityTest: true,
    isVirtual: true
  },
  InitializeAndManageAsteroid: {
    multisystemCalls: ['InitializeAsteroid', 'ManageAsteroid'],
    equalityTest: ['asteroid.id'],
    isVirtual: true
  },
  InitializeAndPurchaseAsteroid: {
    multisystemCalls: ['InitializeAsteroid', 'PurchaseAsteroid'],
    equalityTest: ['asteroid.id'],
    isVirtual: true
  },
};

export function ChainTransactionProvider({ children }) {
  const { account, walletContext: { starknet } } = useAuth();
  const { activities/*, lastBlockNumber*/ } = useActivitiesContext();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const dispatchFailedTransaction = useStore(s => s.dispatchFailedTransaction);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  // const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const dispatchClearTransactionHistory = useStore(s => s.dispatchClearTransactionHistory);
  const pendingTransactions = useStore(s => s.pendingTransactions);

  const [promptingTransaction, setPromptingTransaction] = useState(false);

  const contracts = useMemo(() => {
    if (!!starknet?.account) {

      // include all default systems + any virtuals included in customConfigs
      const systemKeys = [
        ...Object.keys(System.Systems),
        ...(Object.keys(customConfigs).filter((k) => !!customConfigs[k].isVirtual))
      ];

      return systemKeys.reduce((acc, systemName) => {
        const config = {
          equalityTest: 'ALL',
          ...(customConfigs[systemName] || {})
        };

        acc[systemName] = {
          equalityTest: config.equalityTest,

          execute: async (rawVars) => {
            let runSystems;
            if (config.multisystemCalls) {
              runSystems = config.multisystemCalls;
            } else if (config.bulkSystemCall) {
              runSystems = Array.from(Array(config.getRepeatTally(rawVars))).map(() => config.bulkSystemCall);
            } else {
              runSystems = [systemName];
            }

            let totalPrice = 0n;
            const calls = [];
            for (let runSystem of runSystems) {
              const vars = customConfigs[runSystem]?.preprocess ? customConfigs[runSystem].preprocess(rawVars) : rawVars;
              calls.push(/*System.*/getRunSystemCall(runSystem, vars, process.env.REACT_APP_STARKNET_DISPATCHER));
              if (customConfigs[runSystem]?.getPrice) {
                totalPrice += await customConfigs[runSystem].getPrice(vars);
              }
            }

            if (totalPrice > 0n) {
              calls.unshift(System.getApproveEthCall(
                totalPrice, process.env.REACT_APP_ERC20_TOKEN_ADDRESS, process.env.REACT_APP_STARKNET_DISPATCHER
              ));
            }

            console.log('execute', calls);
            // calls[0].calldata[1] = "27";
            return starknet.account.execute(calls);
          },

          onConfirmed: (event, vars) => {
            if (config.getConfirmedAlert) {
              createAlert(config.getConfirmedAlert(vars));
            }
            config.onConfirmed && config.onConfirmed(event, vars);
          },

          onTransactionError: (err, vars) => {
            console.error(err, vars);
          },
        };

        return acc;
      }, {});
    }
    return null;
  }, [createAlert, starknet?.account?.address, starknet?.account?.provider?.baseUrl]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // (sanity check) this should not be possible since pendingTransaction should not be created
        // without txHash... so we aren't even reporting this error to user since should not happen
        if (!txHash) return dispatchPendingTransactionComplete(txHash);

        if (!transactionWaiters.current.includes(txHash)) {
          transactionWaiters.current.push(txHash);

          // NOTE: waitForTransaction is slow -- often slower than server to receive and process
          //  event and send back to frontend... so we are using it just to listen for errors
          //  (activities from backend will demonstrate success)
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
              if (txHash) { // TODO: may want to display pre-tx failures if using session wallet
                dispatchFailedTransaction({
                  key,
                  vars,
                  txHash,
                  err: err?.message || 'Transaction was rejected.'
                });
                dispatchPendingTransactionComplete(txHash);
              }
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
      pendingTransactions.forEach((tx) => {
        const { key, vars, txHash } = tx;

        // check for event
        // TODO (enhancement): only need to check new activities diff (not all)
        const txHashBInt = BigInt(txHash);

        const txEvent = (activities || []).find((a) => a.event.transactionHash && BigInt(a.event.transactionHash) === txHashBInt)?.event;
        if (txEvent) {
          contracts[key].onConfirmed(txEvent, vars);
          dispatchPendingTransactionComplete(txHash);
        }

        //
        // TODO: fix below: move this into its own effect dependent only on block number changes so not running getTransactionReceipt so often

        // // if pending transaction has not turned into an event within 45 seconds
        // // check every useEffect loop if tx is rejected (or missing)
        // // TODO: should potentially also try loading full activities using $since tx to see if we missed a ws message
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
        // }
      });
    }
  }, [activities?.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  // TODO: should probably re-implement this
  // useEffect(() => {
  //   if (contracts && pendingTransactions?.length) {
  //     pendingTransactions.filter((tx) => !tx.txEvent).forEach((tx) => {
  //       // if it's been 45+ seconds, start checking on each block if has been rejected (or missing)
  //       if (chainTime > Math.floor(tx.timestamp / 1000) + 45) {
  //         const { key, vars, txHash } = tx;

  //         genericProvider.getTransactionReceipt(txHash)
  //           .then((receipt) => {
  //             if (receipt && receipt.status === 'REJECTED') {
  //               contracts[key].onTransactionError(receipt, vars);
  //               dispatchFailedTransaction({
  //                 key,
  //                 vars,
  //                 txHash,
  //                 err: receipt.status_data || 'Transaction was rejected.'
  //               });
  //               dispatchPendingTransactionComplete(txHash);
  //             }
  //           })
  //           .catch((err) => {
  //             console.warn(err);
  //           });
  //       }
  //     });
  //   }
  // }, [])

  const execute = useCallback(async (key, vars, meta = {}) => {
    if (contracts && contracts[key]) {
      const { execute, onTransactionError } = contracts[key];

      setPromptingTransaction(true);

      try {
        // TODO: when there are consistent block times on starknet next year, we can remove this extra
        // check and just use Date.now() (setting the buffer on the $since query to blockTime)
        // get block so can tag pending transaction with accurate timestamp
        let block;
        try {
          block = await starknet.provider.getBlock();
        } catch (e) {
          console.warn('Could not fetch pending block', e)
        }

        // execute
        const tx = await execute(vars);
        dispatchPendingTransaction({
          key,
          vars,
          meta,
          timestamp: block?.timestamp ? (block.timestamp * 1000) : null,
          txHash: tx.transaction_hash,
          waitingOn: 'TRANSACTION'
        });
      } catch (e) {
        // "User abort" is argent, 'Execute failed' is braavos
        // TODO: in Braavos, is "Execute failed" a generic error? in that case, we should still show
        // (and it will just be annoying that it shows a failure on declines)
        // console.log('failed', e);
        if (!['User abort', 'Execute failed'].includes(e?.message)) {
          dispatchFailedTransaction({
            key,
            vars,
            meta,
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
        data: { content: 'Account is disconnected or contract is invalid.' },
        level: 'warning',
      });
    }
  }, [contracts]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPendingTx = useCallback((key, vars) => {
    if (contracts && contracts[key]) {
      return pendingTransactions.find((tx) => {
        if (tx.key === key) {
          if (contracts[key].equalityTest === true) {
            return true;
          } else if (contracts[key].equalityTest === 'ALL') {
            console.log('in here for ', key, tx.vars, vars, isEqual(tx.vars, vars));
            return isEqual(tx.vars, vars);
          } else if (contracts[key].equalityTest) {
            return !contracts[key].equalityTest.find((k) => get(tx.vars, k) !== get(vars, k));
          }
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

// TODO: ecs refactor
//  below is all the old contract code, remove this when done it as a reference

// // TODO: now that all are on dispatcher, could probably collapse a lot of redundant code in getContracts
// const getContracts = (account) => ({
//   // 'PURCHASE_ASTEROID': {
//   //   address: process.env.REACT_APP_STARKNET_DISPATCHER,
//   //   config: configs.Dispatcher,
//   //   transact: (contract) => async ({ i }) => {
//   //     const { price } = await contract.call('AsteroidSale_getPrice', [i]);
//   //     const priceParts = Object.values(price).map((part) => BigInt(part).toString());
//   //     const calls = [
//   //       {
//   //         contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
//   //         entrypoint: 'approve',
//   //         calldata: [
//   //           process.env.REACT_APP_STARKNET_DISPATCHER,
//   //           ...priceParts
//   //         ]
//   //       },
//   //       {
//   //         contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
//   //         entrypoint: 'AsteroidSale_purchase',
//   //         calldata: [
//   //           i,
//   //           ...priceParts
//   //         ]
//   //       },
//   //     ];
//   //     return account.execute(calls);
//   //   }
//   // },

//   'NAME_ASTEROID': {
//     transact: ({ i, name }) => {
//       // return account.execute([
//       //   getRunSystemCall('ChangeName', { i, name })
//       // ])
//     }

//     // await accounts[0].invoke(contract, 'execute', {
//     //   method: name, calldata: [ 2, shortStringToFelt('Asteroid'), 1, shortStringToFelt('AdaliaPrime') ]
//     // });

//     // contract.invoke('Asteroid_setName', [
//     //   i,
//     //   shortString.encodeShortString(name)
//     // ])
//   },
//   // 'NAME_ASTEROID': {
//   //   address: process.env.REACT_APP_STARKNET_DISPATCHER,
//   //   config: configs.Dispatcher,
//   //   transact: (contract) => ({ i, name }) => contract.invoke('Asteroid_setName', [
//   //     i,
//   //     shortString.encodeShortString(name)
//   //   ])
//   // },
//   'START_ASTEROID_SCAN': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ i, boost, _packed, _proofs }) => contract.invoke('Asteroid_startScan', [
//       i,
//       _packed.features,
//       _proofs.features,
//       boost,
//       _packed.bonuses,
//       _proofs.boostBonus,
//     ]),
//     isEqual: (txVars, vars) => txVars.id === vars.id
//   },
//   'FINISH_ASTEROID_SCAN': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ i }) => contract.invoke('Asteroid_finishScan', [i]),
//   },
//   'SET_ACTIVE_CREW': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ crewId, crewmates }) => {
//       if (crewId) {
//         return contract.invoke(
//           'Crew_setComposition',
//           [
//             crewId,
//             [...crewmates]
//           ]
//         );
//       } else {
//         return contract.invoke(
//           'Crew_mint',
//           [
//             [...crewmates]
//           ]
//         );
//       }
//     },
//     isEqual: () => true,
//   },
//   // // NOTE: this is just for debugging vvv
//   // 'PURCHASE_UNINITIALIZED_CREWMATE': {
//   //   address: process.env.REACT_APP_STARKNET_DISPATCHER,
//   //   config: configs.Dispatcher,
//   //   transact: (contract) => async () => {
//   //     const { price } = await contract.call('CrewmateSale_getPrice');
//   //     const priceParts = Object.values(price).map((part) => part.toNumber());
//   //     const calls = [
//   //       {
//   //         contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
//   //         entrypoint: 'approve',
//   //         calldata: [
//   //           process.env.REACT_APP_STARKNET_DISPATCHER,
//   //           ...priceParts
//   //         ]
//   //       },
//   //       {
//   //         contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
//   //         entrypoint: 'Crewmate_purchaseAdalian',
//   //         calldata: [
//   //           ...priceParts,
//   //         ]
//   //       },
//   //     ];

//   //     return account.execute(calls);
//   //   },
//   //   isEqual: () => true,
//   // },
//   // // ^^^
//   'INITIALIZE_CREWMATE': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => async ({ i, name, features, traits, crewId = 0 }) => {
//       return contract.invoke('Crewmate_initializeAdalian', [
//         i,
//         shortString.encodeShortString(name),
//         [
//           features.crewCollection,
//           features.gender,
//           features.body,
//           features.crewClass,
//           features.title,
//           features.clothes,
//           features.hair,
//           features.face,
//           features.hairColor,
//           features.head,
//           features.item,
//         ].map((x) => x.toString()),
//         [
//           traits.drive,
//           traits.classImpactful,
//           traits.driveCosmetic,
//           traits.cosmetic,
//         ].map((t) => t.id.toString()),
//         crewId
//       ]);
//     },
//     isEqual: (vars, txVars) => vars.id === txVars.id,
//   },
//   'PURCHASE_AND_INITIALIZE_CREWMATE': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => async ({ name, features, traits, crewId }) => {
//       const { price } = await contract.call('CrewmateSale_getPrice');
//       const priceParts = Object.values(price).map((part) => part.toNumber());
//       const calls = [
//         {
//           contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
//           entrypoint: 'approve',
//           calldata: [
//             process.env.REACT_APP_STARKNET_DISPATCHER,
//             ...priceParts
//           ]
//         },
//         {
//           contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
//           entrypoint: 'Crewmate_purchaseAndInitializeAdalian',
//           calldata: [
//             ...priceParts,
//             shortString.encodeShortString(name),
//             '11', // array len v
//             ...[
//               features.crewCollection,
//               features.gender,
//               features.body,
//               features.crewClass,
//               features.title,
//               features.clothes,
//               features.hair,
//               features.face,
//               features.hairColor,
//               features.head,
//               features.item,
//             ].map((x) => x.toString()),
//             '4', // array len v
//             ...[
//               traits.drive,
//               traits.classImpactful,
//               traits.driveCosmetic,
//               traits.cosmetic,
//             ].map((t) => t.id.toString()),
//             crewId.toString()
//           ]
//         },
//       ];

//       return account.execute(calls);
//     },
//     isEqual: () => true,
//   },
//   'NAME_CREW': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ i, name }) => contract.invoke(
//       'Crewmate_setName',
//       [
//         i,
//         shortString.encodeShortString(name)
//       ]
//     ),
//   },

//   'START_CORE_SAMPLE': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, resourceId, crewId, sampleId = 0 }) => contract.invoke(
//       'CoreSample_startSampling',
//       [asteroidId, lotId, resourceId, sampleId, crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'lotId', 'crewId'],
//   },
//   'FINISH_CORE_SAMPLE': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, resourceId, crewId, sampleId }) => contract.invoke(
//       'CoreSample_finishSampling',
//       [asteroidId, lotId, resourceId, sampleId, crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'lotId', 'crewId'],
//   },

//   'PLAN_CONSTRUCTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ buildingType, asteroidId, lotId, crewId }) => contract.invoke(
//       'Construction_plan',
//       [buildingType, asteroidId, lotId, crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'lotId', 'crewId']
//   },
//   'UNPLAN_CONSTRUCTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
//       'Construction_unplan',
//       [asteroidId, lotId, crewId]
//     ),
//     isEqual: 'ALL'
//   },

//   'START_CONSTRUCTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
//       'Construction_start',
//       [asteroidId, lotId, crewId]
//     ),
//     isEqual: 'ALL'
//   },
//   'FINISH_CONSTRUCTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
//       'Construction_finish',
//       [asteroidId, lotId, crewId]
//     ),
//     isEqual: 'ALL'
//   },
//   'DECONSTRUCT': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
//       'Construction_deconstruct',
//       [asteroidId, lotId, crewId]
//     ),
//     isEqual: 'ALL'
//   },

//   'START_EXTRACTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId }) => contract.invoke(
//       'Extraction_start',
//       [asteroidId, lotId, resourceId, sampleId, amount, destinationLotId, destinationInventoryId, crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'lotId', 'crewId']
//   },
//   'FINISH_EXTRACTION': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, lotId, crewId }) => contract.invoke(
//       'Extraction_finish',
//       [asteroidId, lotId, crewId]
//     ),
//     isEqual: 'ALL'
//   },

//   'START_DELIVERY': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, originLotId, originInvId, destLotId, destInvId, resources, crewId }) => contract.invoke(
//       'Inventory_transferStart',
//       [asteroidId, originLotId, originInvId, destLotId, destInvId, Object.keys(resources), Object.values(resources), crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'originLotId', 'crewId']
//   },
//   'FINISH_DELIVERY': {
//     address: process.env.REACT_APP_STARKNET_DISPATCHER,
//     config: configs.Dispatcher,
//     transact: (contract) => ({ asteroidId, destLotId, destInvId, deliveryId, crewId }) => contract.invoke(
//       'Inventory_transferFinish',
//       [asteroidId, destLotId, destInvId, deliveryId, crewId]
//     ),
//     isEqual: (txVars, vars) => ['asteroidId', 'crewId', 'deliveryId', 'destLotId']
//   }
// });