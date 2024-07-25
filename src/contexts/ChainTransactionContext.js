import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Address, Asteroid, Entity, Order, System } from '@influenceth/sdk';
import { isEqual, get } from 'lodash';
import { Account, hash, num, shortString, uint256 } from 'starknet';
import { fetchBuildExecuteTransaction, fetchQuotes } from '@avnu/avnu-sdk';
import * as gasless from '@avnu/gasless-sdk';

import useActivitiesContext from '~/hooks/useActivitiesContext';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import { useUsdcPerEth } from '~/hooks/useSwapQuote';
import useWalletBalances from '~/hooks/useWalletBalances';
import api from '~/lib/api';
import { cleanseTxHash, safeBigInt } from '~/lib/utils';
import { TOKEN } from '~/lib/priceUtils';

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

// TODO: equalityTest default of 'i' doesn't make sense anymore

// TODO: move systems into their own util file (like activities)

// supported configs:
//  confirms, equalityTest

// TODO: when equalityTest is ['callerCrew.id'], can't it just be `true`?
const customConfigs = {
  // customization of Systems configs from sdk
  AcceptDelivery: {
    equalityTest: ['delivery.id'],
    getTransferConfig: ({ caller, delivery, price }) => ({
      amount: safeBigInt(price || 0),
      recipient: caller,
      memo: Entity.packEntity(delivery)
    })
  },
  AcceptPrepaidAgreement: {
    equalityTest: ['target.id', 'target.label', 'permission'],
    getTransferConfig: ({ recipient, permission, permitted, target, termPrice }) => ({
      amount: safeBigInt(termPrice),
      recipient,
      memo: [
        Entity.packEntity(target),
        permission,
        Entity.packEntity(permitted),
      ]
    })
  },
  AnnotateEvent: {
    equalityTest: ['transaction_hash', 'log_index'],
  },
  CancelPrepaidAgreement: {
    equalityTest: ['target.id', 'target.label', 'permission'],
    getTransferConfig: ({ agreementPath, refundAmount, recipient }) => ({
      amount: safeBigInt(refundAmount),
      recipient,
      memo: (agreementPath || '').split('.')
    })
  },
  ExtendPrepaidAgreement: {
    equalityTest: ['target.id', 'target.label', 'permission'],
    getTransferConfig: ({ recipient, permission, permitted, target, termPrice }) => ({
      amount: safeBigInt(termPrice),
      recipient,
      memo: [
        Entity.packEntity(target),
        permission,
        Entity.packEntity(permitted),
      ]
    })
  },
  ArrangeCrew: { equalityTest: ['caller_crew.id'] },

  AssembleShipStart: { equalityTest: ['dry_dock.id', 'dry_dock_slot'] },
  AssembleShipFinish: { equalityTest: ['dry_dock.id', 'dry_dock_slot'] },

  ChangeName: { equalityTest: ['entity.id', 'entity.label'] },
  ConfigureExchange: { equalityTest: ['exchange.id'] },

  ConstructionAbandon: { equalityTest: ['building.id'] },
  ConstructionDeconstruct: { equalityTest: ['building.id'] },
  ConstructionFinish: { equalityTest: ['building.id'] },
  ConstructionPlan: { equalityTest: ['lot.id'] },
  ConstructionStart: { equalityTest: ['building.id'] },

  ExtractResourceStart: { equalityTest: ['extractor.id', 'extractor_slot'] },
  ExtractResourceFinish: { equalityTest: ['extractor.id', 'extractor_slot'] },

  ProcessProductsStart: { equalityTest: ['processor.id', 'processor_slot'] },
  ProcessProductsFinish: { equalityTest: ['processor.id', 'processor_slot'] },

  ListDepositForSale: { equalityTest: ['deposit.id'] },
  UnlistDepositForSale: { equalityTest: ['deposit.id'] },

  SampleDepositFinish: { equalityTest: ['deposit.id'] },
  SampleDepositImprove: { equalityTest: ['deposit.id'] },
  SampleDepositStart: { equalityTest: ['lot.id', 'caller_crew.id'] },

  ExchangeCrew: { equalityTest: true },
  InitializeAsteroid: {
    preprocess: ({ asteroid }) => ({
      asteroid,
      celestial_type: safeBigInt(asteroid.Celestial.celestialType),
      mass: safeBigInt(Asteroid.Entity.getMass(asteroid)) * 2n ** 64n,
      radius: safeBigInt(asteroid.Celestial.radius * 1000) * 2n ** 32n / 1000n,
      a: safeBigInt(asteroid.Orbit.a * 10000) * 2n ** 64n / 10000n,
      ecc: safeBigInt(asteroid.Orbit.ecc * 1000) * 2n ** 64n / 1000n,
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
      const { ADALIAN_PURCHASE_PRICE, ADALIAN_PURCHASE_TOKEN } = await api.getConstants(['ADALIAN_PURCHASE_PRICE', 'ADALIAN_PURCHASE_TOKEN']);
      return [BigInt(ADALIAN_PURCHASE_PRICE), Address.toStandard(ADALIAN_PURCHASE_TOKEN)];
    },
    equalityTest: true
  },
  PurchaseAsteroid: {
    getPrice: async ({ asteroid }) => {
      const { ASTEROID_PURCHASE_BASE_PRICE, ASTEROID_PURCHASE_LOT_PRICE, ASTEROID_PURCHASE_TOKEN } = await api.getConstants([
        'ASTEROID_PURCHASE_BASE_PRICE',
        'ASTEROID_PURCHASE_LOT_PRICE',
        'ASTEROID_PURCHASE_TOKEN'
      ]);
      const base = BigInt(ASTEROID_PURCHASE_BASE_PRICE);
      const lot = BigInt(ASTEROID_PURCHASE_LOT_PRICE);
      return [base + lot * BigInt(Asteroid.Entity.getSurfaceArea(asteroid)), Address.toStandard(ASTEROID_PURCHASE_TOKEN)];
    },
    equalityTest: ['asteroid.id']
  },
  PurchaseDeposit: {
    getTransferConfig: ({ recipient, deposit, price }) => ({
      amount: BigInt(price),
      recipient,
      memo: Entity.packEntity(deposit)
    }),
    equalityTest: ['deposit.id']
  },
  InitializeArvadian: { equalityTest: true },
  RecruitAdalian: {
    getPrice: async ({ crewmate }) => {
      if (crewmate?.id > 0) return [0n, TOKEN.ETH]; // if recruiting existing crewmate, no cost
      const { ADALIAN_PURCHASE_PRICE, ADALIAN_PURCHASE_TOKEN } = await api.getConstants(['ADALIAN_PURCHASE_PRICE', 'ADALIAN_PURCHASE_TOKEN']);
      return [BigInt(ADALIAN_PURCHASE_PRICE), Address.toStandard(ADALIAN_PURCHASE_TOKEN)];
    },
    equalityTest: true
  },
  ResolveRandomEvent: {
    equalityTest: true
  },
  ResupplyFood: {
    equalityTest: ['caller_crew.id']
  },
  StationCrew: {
    equalityTest: ['caller_crew.id']
  },
  DockShip: {
    equalityTest: ['caller_crew.id']
  },
  UndockShip: {
    equalityTest: ['caller_crew.id']
  },
  TransitBetweenStart: { equalityTest: ['caller_crew.id'] },
  TransitBetweenFinish: { equalityTest: ['caller_crew.id'] },

  // virtual multi-system wrappers
  // TODO: could do fancier conditional multisystems if that would help
  // i.e. `multisystemCalls: [{ name: 'InitializeAsteroid', cond: (a) => !a.AsteroidProof.used }, 'ScanAsteroid'],`

  BulkPurchaseAdalians: {
    repeatableSystemCall: 'PurchaseAdalian',
    getRepeatTally: (vars) => Math.max(1, Math.floor(vars.tally)),
    equalityTest: true,
    isVirtual: true
  },
  BulkFillSellOrder: {
    batchableSystemCall: 'FillSellOrder',
    isBatchable: true,
    isVirtual: true
  },
  FinishAllReady: {
    multisystemCalls: ({ finishCalls }) => finishCalls.map(({ key, vars }) => ({ system: key, vars })),
    equalityTest: true,
    isVirtual: true,
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
  InitializeAndStartSurfaceScan: {
    multisystemCalls: ['InitializeAsteroid', 'ScanSurfaceStart'],
    equalityTest: ['asteroid.id'],
    isVirtual: true
  },
  InitializeAndStartTransit: {
    multisystemCalls: ['InitializeAsteroid', 'TransitBetweenStart'],
    equalityTest: ['caller_crew.id'],
    isVirtual: true
  },
  InitializeAndClaimPrepareForLaunchReward: {
    multisystemCalls: ['InitializeAsteroid', 'ClaimPrepareForLaunchReward'],
    equalityTest: ['asteroid.id'],
    isVirtual: true
  },
  PurchaseDepositAndExtractResource: {
    multisystemCalls: ['PurchaseDeposit', 'ExtractResourceStart'],
    equalityTest: ['extractor.id'],
    isVirtual: true
  },
  PurchaseDepositAndImprove: {
    multisystemCalls: ['PurchaseDeposit', 'SampleDepositImprove'],
    equalityTest: ['lot.id', 'caller_crew.id'],
    isVirtual: true
  },
  EscrowDepositAndCreateBuyOrder: {
    getEscrowAmount: ({ price, amount, feeTotal }) => {
      return BigInt((price * amount + feeTotal) || 0);
    },
    escrowConfig: {
      entrypoint: 'deposit',
      depositHook: 'CreateBuyOrder',
      depositHookCalldataLength: 15,
      withdrawHook: 'FillBuyOrder',
      withdrawHookCalldataLength: 25,
      withdrawHookKeys: ['buyer_crew', 'exchange', 'product', 'price', 'storage', 'storage_slot'],
      withdrawDataKeys: null
    },
    equalityTest: true, // TODO: ...
    isVirtual: true
  },
  EscrowWithdrawalAndFillBuyOrders: {
    getEscrowAmount: ({ price, amount, makerFee }) => {
      return safeBigInt(price * amount * (1 + makerFee));
    },
    escrowConfig: {
      entrypoint: 'withdraw',
      depositHook: null,
      withdrawHook: 'FillBuyOrder',
      withdrawHookCalldataLength: 25,
      withdrawHookKeys: ['buyer_crew', 'exchange', 'product', 'price', 'storage', 'storage_slot'],
      withdrawDataKeys: ['amount', 'origin', 'origin_slot', 'caller_crew'],
      getWithdrawals: ({ exchange_owner_account, seller_account, payments }) => {
        return [
          { recipient: seller_account, amount: BigInt(payments.toPlayer) },
          { recipient: exchange_owner_account, amount: BigInt(payments.toExchange) },
        ];
      }
    },
    isBatchable: true,
    equalityTest: true, // TODO: ...
    isVirtual: true
  },
  FillSellOrder: {
    getTransferConfig: (vars) => {
      // memo === order path
      const memo = [
        Entity.packEntity(vars.seller_crew),
        Entity.packEntity(vars.exchange),
        Order.IDS.LIMIT_SELL,
        vars.product,
        vars.price,
        Entity.packEntity(vars.storage),
        vars.storage_slot
      ];
      return [
        {
          amount: safeBigInt(vars.payments.toPlayer),
          recipient: vars.seller_account,
          memo
        },
        {
          amount: safeBigInt(vars.payments.toExchange),
          recipient: vars.exchange_owner_account,
          memo
        }
      ];
    }
  },
  UpdatePolicy: {
    multisystemCalls: ({ add, remove }) => [remove, add].filter((c) => !!c),
    equalityTest: ['target.label', 'target.id', 'permission'],
    isVirtual: true
  },
  UpdateAllowlists: {
    multisystemCalls: ({ additions, removals, accountAdditions, accountRemovals, ...vars }) => {
      return [
        ...removals.map((r) => ({
          system: 'RemoveFromWhitelist',
          vars: { ...vars, permitted: r }
        })),
        ...additions.map((a) => ({
          system: 'Whitelist',
          vars: { ...vars, permitted: a }
        })),
        ...accountAdditions.map((a) => ({
          system: 'WhitelistAccount',
          vars: { ...vars, permitted: a }
        })),
        ...accountRemovals.map((r) => ({
          system: 'RemoveAccountFromWhitelist',
          vars: { ...vars, permitted: r }
        })),
      ]
    },
    equalityTest: ['target.label', 'target.id', 'permission'],
    isVirtual: true
  },
  SetNftSellOrder: {
    getNonsystemCalls: ({ tokenAddress, tokenId, price }) => [
      System.getFormattedCall(
        tokenAddress,
        'set_sell_order',
        [
          { value: tokenId, type: 'u256' },
          { value: price, type: 'BigNumber' }
        ]
      )
    ],
    equalityTest: ['tokenAddress', 'tokenId'],
    noSystemCalls: true,
    isVirtual: true,
  },
  FillNftSellOrder: {
    getNonsystemCalls: ({ tokenAddress, tokenId, crew, owner, price }) => {
      const utoken = uint256.bnToUint256(tokenId);
      const calls = [
        System.getTransferWithConfirmationCall(
          owner,
          price,
          [
            shortString.encodeShortString('Ship'),
            utoken.low,
            utoken.high
          ],
          tokenAddress,
          process.env.REACT_APP_STARKNET_SWAY_TOKEN,
        ),
        System.getFormattedCall(
          tokenAddress,
          'fill_sell_order',
          [
            { value: tokenId, type: 'u256' }
          ]
        )
      ];
      if (crew) { // auto-commandeer if crew is passed
        const [commandeerCall] = getSystemCallAndProcessedVars(
          'CommandeerShip',
          { ship: { label: Entity.IDS.SHIP, id: tokenId }, caller_crew: crew }
        );
        calls.push(commandeerCall);
      }
      return calls;
    },
    equalityTest: ['tokenAddress', 'tokenId'],
    noSystemCalls: true,
    isVirtual: true,
  },
  PurchaseStarterPack: {
    repeatableSystemCall: 'PurchaseAdalian',
    getRepeatTally: (vars) => Math.max(1, Math.floor(vars.crewmateTally)),
    getNonsystemCalls: ({ swapCalls }) => swapCalls,
    equalityTest: true,
    isVirtual: true
  }
};

const getSystemCallAndProcessedVars = (runSystem, rawVars, encodeEntrypoint = false, limitToVars = false, overrideCalldataLength = false) => {
  let vars = customConfigs[runSystem]?.preprocess ? customConfigs[runSystem].preprocess(rawVars) : rawVars;
  const systemCall = System.getRunSystemCall(runSystem, vars, process.env.REACT_APP_STARKNET_DISPATCHER, limitToVars);
  if (encodeEntrypoint) { // used where nested (i.e. in escrow call)
    systemCall.entrypoint = hash.getSelectorFromName(systemCall.entrypoint);
  }
  if (overrideCalldataLength) { // used for escrow where hooks only include partial calldata
    systemCall.calldata[1] = `${overrideCalldataLength}`;
  }
  console.log('getSystemCallAndProcessedVars', runSystem, systemCall);
  return [systemCall, vars];
}

export function ChainTransactionProvider({ children }) {
  const {
    accountAddress,
    allowedMethods,
    authenticated,
    blockNumber,
    blockTime,
    chainId,
    getOutsideExecutionData,
    isDeployed,
    logout,
    provider,
    starknetSession,
    upgradeInsecureSession,
    walletAccount
  } = useSession();
  const activities = useActivitiesContext();
  const { crew, pendingTransactions } = useCrewContext();
  const { data: walletSource } = useWalletBalances();
  const { data: usdcPerEth } = useUsdcPerEth();

  // using a ref since execute is often called from a callback from funding (and
  // it may not reliably get re-memoized with updated wallet values within callback)
  const walletRef = useRef();
  walletRef.current = walletSource;

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const gameplay = useStore(s => s.gameplay);
  const dispatchFailedTransaction = useStore(s => s.dispatchFailedTransaction);
  const dispatchPendingTransaction = useStore(s => s.dispatchPendingTransaction);
  // const dispatchPendingTransactionUpdate = useStore(s => s.dispatchPendingTransactionUpdate);
  const dispatchPendingTransactionComplete = useStore(s => s.dispatchPendingTransactionComplete);
  const dispatchClearTransactionHistory = useStore(s => s.dispatchClearTransactionHistory);

  const [promptingTransaction, setPromptingTransaction] = useState(false);

  // autoresolve when actionType is set but actionType was not actually triggered by actionRound
  const prependEventAutoresolve = useMemo(
    // TODO: can we check with a read call that this doesn't predict failure before prepending it
    //  (i.e. in case local crew value is stale)? might be more reliable anyway
    //  ... or we could also refetch crew again first
    () => crew?.Crew?.actionType
      && crew?.Crew?.actionRound
      // && (crew?.Crew?.actionRound + RandomEvent.MIN_ROUNDS) <= blockNumber // TODO: actionRound tmp fix
      && !crew?._actionTypeTriggered,
    [blockNumber, crew?.Crew?.actionType, crew?.Crew?.actionRound, crew?._actionTypeTriggered]
  );

  const executeWithAccount = useCallback(async (calls) => {
    // Format calls for proper stringification
    const formattedCalls = calls.map((call) => {
      return { ...call, calldata: call.calldata.map(a => num.toHex(a)) };
    });

    // Check if we can utilize a signed session to execute calls
    const canUseSessionKey = !!gameplay.useSessions && !!starknetSession && !calls.some((c) => {
      const found = allowedMethods.find((m) => {
        return m['Contract Address'] === c.contractAddress && m.selector === c.entrypoint;
      });

      return !found;
    });

    // Use session wallet if possible, otherwise regular wallet
    const account = canUseSessionKey ? starknetSession : walletAccount;

    // Check and store the gasless compatibility status
    if (
      isDeployed
      && gameplay.feeToken === 'SWAY'
      && (await gasless.fetchAccountCompatibility(
        accountAddress, { baseUrl: process.env.REACT_APP_AVNU_API_URL }
      )).isCompatible
    ) {
      // Use gasless via relayer for non-ETH / STRK transactions
      const simulation = await walletAccount.simulateTransaction(
        [{ type: 'INVOKE_FUNCTION', payload: calls }],
        { skipValidate: true }
      );

      const tokens = await gasless.fetchGasTokenPrices({ baseUrl: process.env.REACT_APP_AVNU_API_URL });
      const gasToken = tokens.find((t) => Address.areEqual(t.tokenAddress, TOKEN.SWAY));

      // Double the fee estimation and check for sufficient funds to ensure transaction success
      const maxFee = gasless.getGasFeesInGasToken(simulation[0].suggestedMaxFee, gasToken) * 2n;

      // Check if wallet has sufficient funds for gas fees
      if (walletRef.current?.tokenBalance) {
        const match = Object.entries(walletRef.current.tokenBalance).find((e) => {
          return Address.areEqual(e[0], gasToken.tokenAddress);
        });

        // Skip this check in testnet since the allowed gas tokens are inconsistent
        if (process.env.REACT_APP_DEPLOYMENT === 'production' && (!match || match[1] < maxFee)) {
          createAlert({
            type: 'GenericAlert',
            data: { content: 'Insufficient wallet balance, please recharge in the store.' },
            level: 'warning',
          });

          throw new Error('Insufficient wallet balance');
        }
      }

      const { typedData, signature } = await getOutsideExecutionData(formattedCalls, gasToken.tokenAddress, maxFee);
      return await gasless.fetchExecuteTransaction(
        accountAddress,
        JSON.stringify(typedData),
        signature,
        { baseUrl: process.env.REACT_APP_AVNU_API_URL }
      );
    }

    return await account.execute(formattedCalls);
  }, [
    accountAddress,
    allowedMethods,
    createAlert,
    chainId,
    gameplay.feeToken,
    getOutsideExecutionData,
    isDeployed,
    starknetSession,
    walletAccount
  ]);

  const contracts = useMemo(() => {
    if (!!walletAccount) {

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
            let systemCalls;
            if (config.multisystemCalls) {
              systemCalls = (
                typeof config.multisystemCalls === 'function'
                ? config.multisystemCalls(rawVars)
                : config.multisystemCalls
              ).map((runSystem) => {
                if (typeof runSystem === 'string') {
                  return { runSystem, rawVars };
                } else if (typeof runSystem === 'object') {
                  const { system, vars } = runSystem;
                  return { runSystem: system, rawVars: vars };
                }
              });
              console.log('multisystemCalls', systemCalls, rawVars);
            } else if (config.repeatableSystemCall) {
              systemCalls = Array.from(Array(config.getRepeatTally(rawVars))).map(() => ({ runSystem: config.repeatableSystemCall, rawVars }));
            } else if (config.isBatchable) {
              const rawVarSets = Array.isArray(rawVars) ? rawVars : [rawVars];
              systemCalls = rawVarSets.map((rawVarSet) => ({ runSystem: config.batchableSystemCall || systemName, rawVars: rawVarSet }));
            } else if (config.noSystemCalls) {
              systemCalls = [];
            } else {
              systemCalls = [{ runSystem: systemName, rawVars }];
            }

            // mark as escrow interactors
            if (config.escrowConfig) {
              systemCalls.forEach((r) => r.escrowConfig = config.escrowConfig);
            }

            // if actionType is set but the random event was not actually triggered,
            // prepend resolveRandomEvent with choice 0 so that the event is cleared
            if (prependEventAutoresolve && !(config.noSystemCalls || config.isUnblockable)) { // TODO: fill in these isUnblockable's
              const caller_crew = (Array.isArray(rawVars) ? rawVars.find((rv) => !!rv.caller_crew) : rawVars)?.caller_crew;

              if (caller_crew && caller_crew.id !== 0) {
                systemCalls.unshift({
                  runSystem: 'ResolveRandomEvent',
                  rawVars: { caller_crew, choice: 0 }
                });
              }
            }

            let totalEscrow = 0n;
            let totalPrice = 0n;
            let totalPriceToken;
            const calls = config.getNonsystemCalls ? config.getNonsystemCalls(rawVars) : [];
            for (let { runSystem, rawVars, escrowConfig } of systemCalls) {
              console.log('systemCall', runSystem, rawVars, escrowConfig);
              let processedVars;

              // escrow-wrapped systems
              if (escrowConfig) {
                const [withdrawSystemCall] = escrowConfig.withdrawHook
                  ? getSystemCallAndProcessedVars(
                    escrowConfig.withdrawHook,
                    rawVars,
                    true,
                    escrowConfig.withdrawHookKeys,
                    escrowConfig.withdrawHookCalldataLength
                  )
                  : [];

                // approve escrow amount
                const escrowAmount = config?.getEscrowAmount ? config.getEscrowAmount(rawVars) : 0n;

                // escrow deposit
                if (escrowConfig.entrypoint === 'deposit') {
                  const [depositSystemCall, depositVars] = getSystemCallAndProcessedVars(
                    escrowConfig.depositHook,
                    rawVars,
                    true,
                    System.Systems[escrowConfig.depositHook]?.inputs.map((i) => i.name).filter((n) => !/^escrow_/.test(n)),
                    escrowConfig.depositHookCalldataLength
                  );
                  processedVars = depositVars;
                  totalEscrow += escrowAmount;

                  const escrowCall = System.getEscrowDepositCall(
                    escrowAmount,
                    depositSystemCall,
                    withdrawSystemCall,
                    process.env.REACT_APP_STARKNET_ESCROW,
                    process.env.REACT_APP_STARKNET_SWAY_TOKEN,
                  );

                  console.log('runSystem via escrow deposit', runSystem, processedVars, escrowCall);
                  calls.push(escrowCall);

                // escrow withdrawal
                } else {
                  processedVars = customConfigs[escrowConfig.withdrawHook]?.preprocess ? customConfigs[escrowConfig.withdrawHook].preprocess(rawVars) : rawVars;

                  const withdrawSystemData = escrowConfig.withdrawDataKeys && System.formatSystemCalldata(
                    escrowConfig.withdrawHook,
                    processedVars,
                    escrowConfig.withdrawDataKeys
                  );

                  const escrowCall = System.getEscrowWithdrawCall(
                    escrowConfig.getWithdrawals(processedVars),
                    rawVars.depositCaller,
                    withdrawSystemCall,
                    withdrawSystemData,
                    process.env.REACT_APP_STARKNET_ESCROW,
                    process.env.REACT_APP_STARKNET_SWAY_TOKEN,
                  );

                  console.log('runSystem via escrow withdrawal', runSystem, processedVars, escrowCall);
                  calls.push(escrowCall);
                }

              // standard systems
              } else {
                const [systemCall, vars] = getSystemCallAndProcessedVars(runSystem, rawVars);
                processedVars = vars;
                console.log('runSystem', runSystem, processedVars, systemCall);
                calls.push(systemCall);
              }

              if (customConfigs[runSystem]?.getTransferConfig) {
                const transferCalldata = await customConfigs[runSystem].getTransferConfig(processedVars);
                const transferCalldatas = Array.isArray(transferCalldata) ? transferCalldata : [transferCalldata];
                transferCalldatas.forEach((t) => {
                  calls.unshift(System.getTransferWithConfirmationCall(
                    t.recipient,
                    t.amount,
                    t.memo,
                    t.consumer || process.env.REACT_APP_STARKNET_DISPATCHER,
                    process.env.REACT_APP_STARKNET_SWAY_TOKEN,
                  ));
                });
              }

              if (customConfigs[runSystem]?.getPrice) {
                const [tokenAmount, token] = (await customConfigs[runSystem].getPrice(processedVars)) || [];

                if (![TOKEN.ETH, TOKEN.USDC].includes(token)) {
                  throw new Error('Invalid pricing token (only ETH or USDC supported)');
                }

                if (totalPriceToken && totalPriceToken !== token) {
                  throw new Error('Mixed currency transactions are not supported');
                }

                totalPrice += tokenAmount;
                totalPriceToken = token;
              }
            }

            if (totalEscrow > 0n) {
              calls.unshift(System.getApproveErc20Call(
                totalEscrow, process.env.REACT_APP_STARKNET_SWAY_TOKEN, process.env.REACT_APP_STARKNET_ESCROW
              ));
            }

            // approve totalPriceToken to make purchase
            if (totalPrice > 0n) {
              calls.unshift(System.getApproveErc20Call(
                totalPrice,
                totalPriceToken,
                process.env.REACT_APP_STARKNET_DISPATCHER
              ));

              const wallet = walletRef.current;
              if (!wallet) throw new Error('Wallet balance not loaded');
              const totalWalletValueInToken = wallet.combinedBalance?.to(totalPriceToken);

              // if don't have enough USDC + ETH to cover it, throw funds error
              if (totalPrice > safeBigInt(totalWalletValueInToken)) {
                console.log('EXECUTE', wallet, wallet.combinedBalance, wallet.combinedBalance, wallet.combinedBalance?.to(totalPriceToken));
                const fundsError = new Error('Insufficient wallet balance');
                fundsError.additionalFundsRequired = parseInt(totalPrice - BigInt(totalWalletValueInToken));
                fundsError.additionalFundsToken = totalPriceToken;
                throw fundsError;

              // else (have enough USDC + ETH) if don't have enough in totalPriceToken
              // to cover tx, prepend swap calls to cover it as well
              } else {
                let balanceInTargetToken = wallet.tokenBalance[totalPriceToken];
                if (totalPrice > balanceInTargetToken) {
                  if (!usdcPerEth) throw new Error('Conversion rate not loaded');

                  const isEthToUsdc = totalPriceToken === process.env.REACT_APP_USDC_TOKEN_ADDRESS;
                  const fromAddress = isEthToUsdc ? process.env.REACT_APP_ERC20_TOKEN_ADDRESS : process.env.REACT_APP_USDC_TOKEN_ADDRESS;
                  const toAddress = isEthToUsdc ? process.env.REACT_APP_USDC_TOKEN_ADDRESS : process.env.REACT_APP_ERC20_TOKEN_ADDRESS;
                  const amount = totalPrice - balanceInTargetToken;

                  // buy enough excess to cover slippage
                  const slippage = 0.01;
                  const targetSwapAmount = (1 / (1 - slippage)) * parseInt(amount);

                  // usdcPerEth is estimated from a small amount (presumably the best price) so
                  // sellAmount may be too low to end up with the required buyAmount...

                  // iterate based on the response until we have sufficient buyAmount to cover the purchase
                  // TODO: would be nice for AVNU to have buyAmount as an option here instead (to avoid loop)
                  let quote;
                  let actualConv = isEthToUsdc ? usdcPerEth : (1 / usdcPerEth);
                  while (parseInt(quote?.buyAmount || 0) < targetSwapAmount) {
                    const quotes = await fetchQuotes({
                      sellTokenAddress: fromAddress,
                      buyTokenAddress: toAddress,
                      sellAmount: safeBigInt(Math.ceil(targetSwapAmount / actualConv)),
                      takerAddress: accountAddress,
                    }, { baseUrl: process.env.REACT_APP_AVNU_API_URL });
                    if (!quotes?.[0]) throw new Error('Insufficient swap liquidity');

                    // set quote
                    quote = quotes[0];

                    // improve conversion rate from the purchase size quote (in case need to iterate)
                    // (if conversion rate unchanged but have not reached target, break loop so not stuck)
                    const newConv = parseInt(quote.buyAmount) / parseInt(quote.sellAmount);
                    if (newConv === actualConv) {
                      if (quote.buyAmount < targetSwapAmount) {
                        throw new Error('Swap pricing issue encountered');
                      }
                    }

                    actualConv = newConv;
                  }

                  // prepend swap calls
                  const swapTx = await fetchBuildExecuteTransaction(
                    quote.quoteId,
                    accountAddress,
                    slippage,
                    true,
                    { baseUrl: process.env.REACT_APP_AVNU_API_URL }
                  );

                  console.log('prepend calls', swapTx.calls);
                  calls.unshift(...swapTx.calls);
                }
              }
            }

            console.log('execute', calls);
            return executeWithAccount(calls);
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
  }, [
    accountAddress,
    createAlert,
    executeWithAccount,
    gameplay.feesInSway,
    prependEventAutoresolve,
    starknetSession,
    usdcPerEth
  ]);

  const getTxEvent = useCallback((txHash) => {
    const txHashBInt = safeBigInt(txHash);
    return (activities || []).find((a) => a.event?.transactionHash && safeBigInt(a.event?.transactionHash) === txHashBInt)?.event;
  }, [activities?.length]);

  const transactionWaiters = useRef([]);

  // on logout, clear pending (and failed) transactions
  useEffect(() => {
    if (!authenticated) dispatchClearTransactionHistory();
  }, [authenticated, dispatchClearTransactionHistory]);

  // handle newlyFailedTx in state + effect flow b/c doing directly in catch uses old values
  // of state (i.e. from when the callback was created)
  const [newlyFailedTx, setNewlyFailedTx] = useState();
  useEffect(() => {
    if (newlyFailedTx) {
      const { err, key, vars, txHash } = newlyFailedTx;

      // this somewhat commonly times out even when tx has gone through, so before reporting an error
      // check again that we have not received a related activity
      const txEvent = getTxEvent(txHash);
      if (txEvent) {
        console.warn(`txEvent already exists for "failed" tx ${txHash}`, err);
        contracts[key]?.onConfirmed(txEvent, vars);
        dispatchPendingTransactionComplete(txHash);
      } else {
        contracts[key]?.onTransactionError(err, vars);
        if (txHash) { // TODO: may want to display pre-tx failures if using session wallet
          dispatchFailedTransaction({
            key,
            vars,
            txHash,
            err: err?.message || 'Transaction was rejected.'
          });
          dispatchPendingTransactionComplete(txHash);
        }
      }

      // now that processed, clear this failure
      setNewlyFailedTx();
    }
  }, [contracts, getTxEvent, newlyFailedTx]);

  // on initial load, set provider.waitForTransaction for any pendingTransactions
  // so that we can throw any extension-related or timeout errors needed
  useEffect(() => {
    if (provider && contracts && pendingTransactions?.length) {
      pendingTransactions.forEach(({ key, vars, txHash }) => {
        // (sanity check) this should not be possible since pendingTransaction should not be created
        // without txHash... so we aren't even reporting this error to user since should not happen
        if (!txHash) return dispatchPendingTransactionComplete(txHash);

        if (!transactionWaiters.current.includes(txHash)) {
          transactionWaiters.current.push(txHash);

          // NOTE: waitForTransaction is slow -- often slower than server to receive and process
          //  event and send back to frontend... so we are using it just to listen for errors
          //  (activities from backend will demonstrate success)
          provider.waitForTransaction(txHash, { retryInterval: RETRY_INTERVAL })
            .then((receipt) => {
              // if a tx just went through and account is not known to be deployed,
              // now is a good time to check again if it is deployed
              if (receipt && !isDeployed) upgradeInsecureSession();
            })
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
            .catch((err) => setNewlyFailedTx({ err, key, vars, txHash }))
            .finally(() => {
              // NOTE: keep this in "finally" so also performed on success (even though not handling success)
              transactionWaiters.current = transactionWaiters.current.filter((tx) => tx.txHash !== txHash);
            });
        }
      });
    }
  }, [contracts, pendingTransactions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // console.log('trigger activities effect', activities, pendingTransactions);
    if (contracts && pendingTransactions?.length) {
      pendingTransactions.forEach((tx) => {
        const { key, vars, txHash } = tx;

        // check for event
        // TODO (enhancement): only need to check new activities diff (not all)
        const txEvent = getTxEvent(txHash);
        if (txEvent) {
          contracts[key].onConfirmed(txEvent, vars);
          dispatchPendingTransactionComplete(txHash);
        }
      });
    }
  }, [getTxEvent, pendingTransactions?.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  // on every new block, check for reverted tx's
  // TODO: parse revert_reason to be more readible
  // TODO: time out eventually?
  useEffect(() => {
    if (contracts && pendingTransactions?.length) {
      pendingTransactions.filter((tx) => !tx.txEvent).forEach((tx) => {
        // if it's been X+ seconds since submitted, check if it was reverted
        if (Math.floor(Date.now() / 1000) > Math.floor(tx.timestamp / 1000) + 30) {
          const { key, vars, txHash } = tx;

          provider.getTransactionReceipt(txHash)
            .then((receipt) => {
              if (receipt && receipt.execution_status === 'REVERTED') {
                contracts[key].onTransactionError(receipt, vars);
                dispatchFailedTransaction({
                  key,
                  vars,
                  txHash,
                  err: receipt.revert_reason || 'Transaction was rejected.'
                });
                dispatchPendingTransactionComplete(txHash);
              }
            })
            .catch((err) => {
              console.warn(err);
            });
        }
      });
    }
  }, [blockNumber]);

  const isAccountLocked = useCallback(async () => {
    // Check that the account isn't locked, and prompt to unlock if it is
    try {
      await walletAccount.walletProvider.request({
        type: 'wallet_requestAccounts',
        params: { silent_mode: false }
      });

      return false;
    } catch (e) {
      return true;
    }
  }, [walletAccount]);

  // Allows for multiple explicit / manual calls to be executed in a single transaction
  const executeCalls = useCallback(async (calls) => {
    if (!walletAccount) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Account is disconnected.' },
        level: 'warning',
      });

      return;
    }

    if (!(calls?.length > 0)) {
      console.error('no calls included in executeCalls input');
      return;
    }

    // start prompting state before isAccountLocked since *might* take some time
    // and want to disable isTransaction buttons immediately
    setPromptingTransaction(true);
    if (await isAccountLocked()) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Account is unavailable.' },
        level: 'warning',
      });
      setPromptingTransaction(false);
      return;
    }

    // execute
    try {
      const tx = await executeWithAccount(calls);

      // if a tx just went through and account is not known to be deployed,
      // now is a good time to check again if it is deployed
      if (!isDeployed) {
        const txHash = cleanseTxHash(tx);

        if (txHash) {
          provider.waitForTransaction(txHash, { retryInterval: RETRY_INTERVAL })
            .then((receipt) => { if (receipt) upgradeInsecureSession(); })
        }
      }

      setPromptingTransaction(false);
      return tx;
    } catch (e) {
      setPromptingTransaction(false);
      throw e;  // rethrow
    }
  }, [createAlert, executeWithAccount, isAccountLocked, isDeployed, upgradeInsecureSession, walletAccount])

  // Primary execute method for system calls (requires name of system, etc.)
  const executeSystem = useCallback(async (key, vars, meta = {}) => {
    if (!walletAccount || !contracts || !contracts[key]) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Account is disconnected or contract is invalid.' },
        level: 'warning',
      });
      return;
    }

    // start prompting state before isAccountLocked since *might* take some time
    // and want to disable isTransaction buttons immediately
    setPromptingTransaction(true);
    if (await isAccountLocked()) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Account is unavailable.' },
        level: 'warning',
      });
      setPromptingTransaction(false);
      return;
    }

    // execute
    const { execute: contractExecute, onTransactionError } = contracts[key];
    try {
      const tx = await contractExecute(vars);
      dispatchPendingTransaction({
        key,
        vars,
        meta,
        timestamp: blockTime ? (blockTime * 1000) : null,
        txHash: cleanseTxHash(tx),
        waitingOn: 'TRANSACTION'
      });
    } catch (e) {
      // handle additional funds required
      if (e?.additionalUSDCRequired) {
        setPromptingTransaction(false);
        return e.additionalUSDCRequired;
      }

      // "User abort" is argent, 'Execute failed' is braavos
      // TODO: in Braavos, is "Execute failed" a generic error? in that case, we should still show
      // (and it will just be annoying that it shows a failure on declines)
      // console.log('failed', e);
      if (!['User abort', 'Execute failed', 'Timeout'].includes(e?.message)) {
        dispatchFailedTransaction({
          key,
          vars,
          meta,
          txHash: null,
          err: e?.message || e
        });
      }

      // "Timeout" is in argent (at least) for when tx is auto-rejected b/c previous tx is still pending
      // TODO: should hopefully be able to remove Timeout because would make sessions feel pretty useless
      if (e?.message === 'Timeout') {
        createAlert({
          type: 'GenericAlert',
          data: { content: 'Previous tx is not yet accepted on l2. Wait for the extension notification and try again.' },
          level: 'warning',
          duration: 5000
        });
      }

      // Session expired for Argent web wallet sessions, user should be logged out
      if (e?.message && e?.message.includes('session expired')) {
        createAlert({
          type: 'GenericAlert',
          data: { content: 'Session expired. Please log in again.' },
          level: 'warning',
          duration: 5000
        });

        logout();
      }

      onTransactionError(e, vars);
    }

    setPromptingTransaction(false);
  }, [blockTime, contracts, walletAccount]); // eslint-disable-line react-hooks/exhaustive-deps

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
      execute: executeSystem,
      executeCalls,
      getStatus,
      getPendingTx,
      promptingTransaction
    }}>
      {children}
    </ChainTransactionContext.Provider>
  );
};

export default ChainTransactionContext;
