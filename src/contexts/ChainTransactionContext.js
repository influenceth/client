import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, System } from '@influenceth/sdk';
import { utils as ethersUtils } from 'ethers';

import useAuth from '~/hooks/useAuth';
import useEvents from '~/hooks/useEvents';
import useStore from '~/hooks/useStore';
import useInterval from '~/hooks/useInterval';
import api from '~/lib/api';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

const getNow = () => Math.floor(Date.now() / 1000);

const getApproveEthCall = ({ amount }) => ({
  contractAddress: process.env.REACT_APP_ERC20_TOKEN_ADDRESS,
  entrypoint: 'approve',
  calldata: System.formatCallData('approveEth', { amount }),
});

const getRunSystemCall = (system, input) => ({
  contractAddress: process.env.REACT_APP_STARKNET_DISPATCHER,
  entrypoint: 'run_system',
  calldata: System.formatCallData(system, input),
});

// supported configs:
//  confirms, equalityTest
const customConfigs = {
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
  PlanConstruction: { equalityTest: ['asteroidId', 'crewId', 'lotId'] },
  PurchaseAdalian: {
    getPrice: async () => {
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return Number(ethersUtils.formatEther(String(ADALIAN_PRICE_ETH)));
    },
    equalityTest: true
  },
  PurchaseAsteroid: {
    getPrice: async ({ i }) => {
      const { ASTEROID_BASE_PRICE_ETH, ASTEROID_LOT_PRICE_ETH } = await api.getConstants([
        'ASTEROID_BASE_PRICE_ETH',
        'ASTEROID_LOT_PRICE_ETH'
      ]);
      const base = Number(ethersUtils.formatEther(String(ASTEROID_BASE_PRICE_ETH)));
      const lot = Number(ethersUtils.formatEther(String(ASTEROID_LOT_PRICE_ETH)));
      return base + lot * Asteroid.getSurfaceArea(i);
    },
  },
  UnplanConstruction: { equalityTest: 'ALL' },
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
      return Object.keys(System.Systems).reduce((acc, systemName) => {
        const config = {
          confirms: 1,
          equalityTest: ['i'],
          ...(customConfigs[systemName] || {})
        };
        
        acc[systemName] = {
          confirms: config.confirms,
          equalityTest: config.equalityTest,

          execute: async (vars) => {
            const calls = [getRunSystemCall(systemName, vars)];
            if (config.getPrice) {
              const priceWei = await config.getPrice(starknet.account, vars);
              calls.unshift(getApproveEthCall({ amount: priceWei }));
            }
            return account.execute(calls);
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
          if (contracts[key].equalityTest === true) {
            return true;
          } else if (contracts[key].equalityTest === 'ALL') {
            return !Object.keys(tx.vars).find((k) => tx.vars[k] !== vars[k]);
          } else if (contracts[key].equalityTest) {
            return !contracts[key].equalityTest.find((k) => tx.vars[k] !== vars[k]);
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
