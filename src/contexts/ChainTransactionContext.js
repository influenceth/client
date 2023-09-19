import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Entity, System } from '@influenceth/sdk';
import { utils as ethersUtils } from 'ethers';
import { CallData, Contract, shortString, uint256 } from 'starknet';
import { isEqual, get } from 'lodash';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';
import api from '~/lib/api';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

const getNow = () => Math.floor(Date.now() / 1000);



// const test = () => {
//   const x = Contract.compile('run_system', {
//     name: shortString.encodeShortString('RecruitAdalian'),
//     calldata: [
//       Entity.IDS.CREWMATE, 0, // crewmate entity
//       1, // class
//       1, 28,// impactful
//       3, 4, 36, 5, // cosmetic
//       1, // gender
//       1, // body
//       1, // face
//       0, // hair
//       3, // hair color
//       31, // clothes
//       Entity.IDS.BUILDING, 1, // building entity
//       Entity.IDS.CREW, 3 // caller crew entity
//     ]
//   });
//   console.log('pmk test', x);
// };

////////////
// TODO: move back to the sdk

const formatCalldataType = (type, value) => {
  if (type === 'ContractAddress') {
    return value;
  }
  else if (type === 'Entity') {
    return [value.label, value.id];
  }
  else if (type === 'Number') {
    return value;
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
};

const formatSystemCalldata = (name, vars) => {  // TODO: note name change
  const system = System.Systems[name];  // TODO: "System.Systems" --> "Systems" in sdk
  if (!system) throw new Error(`Unknown system: ${name}`);

  const x = system.inputs.reduce((acc, { name, type, isArray }) => {
    console.log('pmk input', name, type, isArray, vars[name]);
    if (isArray) acc.push(vars[name]?.length || 0);
    (isArray ? vars[name] : [vars[name]]).forEach((v) => {
      console.log('pmk v', v);
      const formattedVar = formatCalldataType(type, v);
      try {
        (Array.isArray(formattedVar) ? formattedVar : [formattedVar]).forEach((val) => {
          console.log('pmk val', val);
          acc.push(val);
        });
      } catch (e) {
        console.warn(`pmk ${name} could not be formatted`, vars[name], e);
      }
    }, []);
    return acc;
  }, []);
  console.log('pmk x', x);
  return x;
};

////////////

const getApproveEthCall = ({ amount }) => ({
  contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
  entrypoint: 'approve',
  // TODO: put in format like the others
  calldata: CallData.compile([
    formatCalldataType('ContractAddress', process.env.REACT_APP_STARKNET_DISPATCHER),
    formatCalldataType('Ether', amount), // TODO: back to sdk version
  ])
});

const getRunSystemCall = (name, input) => ({
  contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  entrypoint: 'run_system',
  calldata: CallData.compile({ name, calldata: formatSystemCalldata(name, input) }),  // TODO: back to sdk version
});

// TODO: equalityTest default of 'i' doesn't make sense anymore

// supported configs:
//  confirms, equalityTest
const customConfigs = {
  // customization of Systems configs from sdk
  ChangeName: { equalityTest: ['entity.id', 'entity.label'] },
  ConstructionStart: { equalityTest: 'ALL' },
  ConstructionFinish: { equalityTest: 'ALL' },
  CoreSampleStart: { equalityTest: ['asteroidId', 'crewId', 'lotId'] },
  CoreSampleFinish: { equalityTest: ['asteroidId', 'crewId', 'lotId'] },
  Deconstruct: { equalityTest: 'ALL' },
  DeliveryStart: { equalityTest: ['asteroidId', 'crewId', 'originLotId'] },
  DeliveryFinish: { equalityTest: ['asteroidId', 'crewId', 'deliveryId', 'destLotId'] },
  ExchangeCrew: { equalityTest: true },
  ExtractionStart: { equalityTest: ['asteroidId', 'crewId', 'lotId'] },
  ExtractionFinish: { equalityTest: 'ALL' },
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
  PlanConstruction: { equalityTest: ['asteroidId', 'crewId', 'lotId'] },
  PurchaseAdalian: {
    getPrice: async () => {
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return Number(ethersUtils.formatEther(String(ADALIAN_PRICE_ETH)));
    },
    equalityTest: true
  },
  PurchaseAsteroid: {
    getPrice: async ({ asteroid }) => {
      console.log('getPrice', { asteroid });
      const { ASTEROID_BASE_PRICE_ETH, ASTEROID_LOT_PRICE_ETH } = await api.getConstants([
        'ASTEROID_BASE_PRICE_ETH',
        'ASTEROID_LOT_PRICE_ETH'
      ]);
      const base = Number(ethersUtils.formatEther(String(ASTEROID_BASE_PRICE_ETH)));
      const lot = Number(ethersUtils.formatEther(String(ASTEROID_LOT_PRICE_ETH)));
      console.log({ ASTEROID_BASE_PRICE_ETH, ASTEROID_LOT_PRICE_ETH, base, lot });
      return base + lot * Asteroid.Entity.getSurfaceArea(asteroid);
    },
    equalityTest: ['asteroid.id']
  },
  RecruitAdalian: {
    getPrice: async ({ crewmate }) => {
      if (crewmate?.id > 0) return 0; // if recruiting existing crewmate, no cost
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return Number(ethersUtils.formatEther(String(ADALIAN_PRICE_ETH)));
    },
    equalityTest: true
  },
  UnplanConstruction: { equalityTest: 'ALL' },

  // virtual multi-system wrappers
  // PurchaseAndRecruitAdalian: {
  //   multisystemCalls: ['RecruitAdalian', 'ChangeName'],
  //   equalityTest: true,
  // },

  // TODO: could do fancier conditional multisystems if that would help
  // i.e. `multisystemCalls: [{ name: 'InitializeAsteroid', cond: (a) => !a.AsteroidProof.used }, 'ScanAsteroid'],`
  InitializeAndManageAsteroid: {
    multisystemCalls: ['InitializeAsteroid', 'ManageAsteroid'],
    equalityTest: ['asteroid.id'],
  },
  InitializeAndPurchaseAsteroid: {
    multisystemCalls: ['InitializeAsteroid', 'PurchaseAsteroid'],
    equalityTest: ['asteroid.id'],
  },
};

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

      // include all default systems + any virtuals included in customConfigs
      const systemKeys = [
        ...Object.keys(System.Systems),
        ...(Object.keys(customConfigs).filter((k) => !!customConfigs[k].multisystemCalls))
      ];

      return systemKeys.reduce((acc, systemName) => {
        const config = {
          confirms: 1,
          equalityTest: ['i'],
          ...(customConfigs[systemName] || {})
        };

        acc[systemName] = {
          confirms: config.confirms,
          equalityTest: config.equalityTest,

          execute: async (rawVars) => {
            const runSystems = config.multisystemCalls || [systemName];

            let totalPrice = 0;
            const calls = [];
            for (let runSystem of runSystems) {
              const vars = customConfigs[runSystem]?.preprocess ? customConfigs[runSystem].preprocess(rawVars) : rawVars;
              calls.push(getRunSystemCall(runSystem, vars));
              if (customConfigs[runSystem]?.getPrice) {
                totalPrice += await customConfigs[runSystem].getPrice(vars);
              }
            }

            if (totalPrice > 0) {
              console.log('totalPrice', totalPrice);
              const amount = totalPrice * 1e18; // convert to wei
              console.log('totalPrice amount', amount);
              calls.unshift(getApproveEthCall({ amount }));
            }

            console.log('pmk calls2', calls, starknet.account);
            return starknet.account.execute(calls);
          },

          onEventReceived: (event, vars) => {
            if (config.getEventAlert) {
              createAlert(config.getEventAlert(vars));
            }
            config.onEventReceived && config.onEventReceived(event, vars);
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
            if (contracts[key].getEventAlert) {
              createAlert(contracts[key].getEventAlert(vars));
            }
            contracts[key].onEventReceived && contracts[key].onEventReceived(txEvent, vars);

            // if this event has already been confirmed, trigger completion too; else, just update status
            if (currentBlockNumber >= txEvent.blockNumber + contracts[key].confirms) {
              contracts[key].onConfirmed(txEvent, vars);
              dispatchPendingTransactionComplete(txHash);
            } else {
              dispatchPendingTransactionUpdate(txHash, { txEvent });
            }

          // TODO: fix below
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
          if (contracts[key].equalityTest === true) {
            return true;
          } else if (contracts[key].equalityTest === 'ALL') {
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
