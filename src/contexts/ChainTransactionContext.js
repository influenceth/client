import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Entity, Order, RandomEvent, System } from '@influenceth/sdk';
import { isEqual, get } from 'lodash';
import { hash, shortString, uint256 } from 'starknet';

import useActivitiesContext from '~/hooks/useActivitiesContext';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { cleanseTxHash } from '~/lib/utils';

// import { CallData, shortString, uint256, ec } from 'starknet';
// const Systems = System.Systems;

// // TODO: move this back to sdk once finished debugging
// const formatCalldataValue = (type, value) => {
//   if (type === 'ContractAddress') {
//     return value;
//   } else if (type === 'Entity') {
//     return [value.label, value.id];
//   } else if (type === 'Number') {
//     return Number(value);
//   } else if (type === 'String') {
//     return value;
//   } else if (type === 'Boolean') {
//     return value;
//   } else if (type === 'BigNumber') {
//     return BigInt(value);
//   } else if (type === 'Ether') {
//     return uint256.bnToUint256(value);
//   } else if (type === 'InventoryItem') {
//     return [value.product, value.amount];
//   } else if (type === 'Withdrawal') {
//     return { recipient: value.recipient, amount: uint256.bnToUint256(BigInt(value.amount)) };
//   } else if (type === 'Boolean') {
//     return !!value;
//   } else if (type === 'Fixed64') {
//     const neg = value < 0;
//     const val = BigInt(Math.floor(Math.abs(value) * 2 ** 32));
//     return [val, neg ? 1 : 0];
//   } else if (type === 'Fixed128') {
//     const neg = value < 0;
//     const val = BigInt(Math.floor(Math.abs(value) * 2 ** 64)); // TODO: this will cause precision loss, use bignumber
//     return [val, neg ? 1 : 0];
//   } else if (type === 'EscrowHook') {
//     console.log('EscrowHook', value);
//     if (!value) return { contract: 0, entry_point_selector: '0', calldata: [] };
//     return { contract: value.contractAddress, entry_point_selector: value.entrypoint, calldata: value.calldata };
//   } else { // "Raw"
//     return value;
//   }
// };
// // this is specific to the system's calldata format (i.e. not the full calldata of execute())
// const formatSystemCalldata = (name, vars, limitToVars = false) => {
//   console.log('formatSystemCalldata', { name, vars, limitToVars });
//   const system = Systems[name];
//   if (!system) throw new Error(`Unknown system: ${name}`);

//   const inputs = limitToVars
//     ? system.inputs.filter(({ name }) => limitToVars.includes(name))
//     : system.inputs;
//   const x = inputs.reduce((acc, { name, type, isArray }) => {
//     if (isArray) acc.push(vars[name]?.length || 0);
//     (isArray ? vars[name] : [vars[name]]).forEach((v) => {
//       const formattedVar = formatCalldataValue(type, v);
//       try {
//         (Array.isArray(formattedVar) ? formattedVar : [formattedVar]).forEach((val) => {
//           acc.push(val);
//         });
//       } catch (e) {
//         console.error(`${name} could not be formatted`, vars[name], e);
//       }
//     }, []);
//     return acc;
//   }, []);

//   console.log('formatSystemCalldata (out)', x);

//   return x;
// };

// const getRunSystemCall = (name, input, dispatcherAddress, limitToVars = false) => {
//   console.log('getRunSystemCall', { name, input, dispatcherAddress, limitToVars });
//   return {
//     contractAddress: dispatcherAddress,
//     entrypoint: 'run_system',
//     calldata: CallData.compile({
//       name,
//       calldata: formatSystemCalldata(name, input, limitToVars)
//     })
//   };
// };

// const getEscrowDepositCall = (amount, depositHook, withdrawHook, escrowAddress, swayAddress) => {
//   return {
//     contractAddress: escrowAddress,
//     entrypoint: 'deposit',
//     calldata: CallData.compile([
//       formatCalldataValue('ContractAddress', swayAddress),
//       formatCalldataValue('Ether', amount), // using Ether b/c should match u256
//       formatCalldataValue('EscrowHook', withdrawHook),
//       formatCalldataValue('EscrowHook', depositHook),
//     ])
//   };
// };
// const getEscrowWithdrawCall = (withdrawals, depositCaller, withdrawHook, withdrawData, escrowAddress, swayAddress) => {
//   return {
//     contractAddress: escrowAddress,
//     entrypoint: 'withdraw',
//     calldata: CallData.compile([
//       formatCalldataValue('ContractAddress', depositCaller),
//       formatCalldataValue('ContractAddress', swayAddress),
//       formatCalldataValue('EscrowHook', withdrawHook),
//       // withdrawal data (not part of initial hook)
//       withdrawData.length,
//       ...withdrawData,
//       // span of withdrawal structs
//       `${withdrawals.length}`,
//       ...withdrawals.map((w) => formatCalldataValue('Withdrawal', w)),
//     ])
//   };
// };

// const getTransferWithConfirmationCall = (recipient, amount, memo, consumerAddress, swayAddress) => ({
//   contractAddress: swayAddress,
//   entrypoint: 'transfer_with_confirmation',
//   calldata: CallData.compile([
//     formatCalldataValue('recipient', recipient),
//     formatCalldataValue('amount', amount),
//     formatCalldataValue('memo', Array.isArray(memo) ? ec.starkCurve.poseidonHashMany(memo.map((v) => BigInt(v))) : memo),
//     formatCalldataValue('consumer', consumerAddress)
//   ])
// });

///////////

const RETRY_INTERVAL = 5e3; // 5 seconds
const ChainTransactionContext = createContext();

const getNow = () => Math.floor(Date.now() / 1000);

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
      amount: BigInt(price),
      recipient: caller,
      memo: Entity.packEntity(delivery)
    })
  },
  AcceptPrepaidAgreement: {
    equalityTest: ['target.id', 'target.label', 'permission'],
    getTransferConfig: ({ recipient, permission, permitted, target, termPrice }) => ({
      amount: BigInt(termPrice),
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
      amount: BigInt(refundAmount),
      recipient,
      memo: (agreementPath || '').split('.')
    })
  },
  ExtendPrepaidAgreement: {
    equalityTest: ['target.id', 'target.label', 'permission'],
    getTransferConfig: ({ recipient, permission, permitted, target, termPrice }) => ({
      amount: BigInt(termPrice),
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
      if (crewmate?.id > 0) return 0n; // if recruiting existing crewmate, no cost
      const { ADALIAN_PRICE_ETH } = await api.getConstants('ADALIAN_PRICE_ETH');
      return BigInt(ADALIAN_PRICE_ETH);
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
      return BigInt(Math.round(price * amount * (1 + makerFee)) || 0);
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
          amount: BigInt(Math.round(vars.payments.toPlayer)),
          recipient: vars.seller_account,
          memo
        },
        {
          amount: BigInt(Math.round(vars.payments.toExchange)),
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
  const { accountAddress, authenticated, blockNumber, blockTime, logout, starknet, starknetSession } = useSession();
  const activities = useActivitiesContext();
  const { crew, pendingTransactions } = useCrewContext();

  const createAlert = useStore(s => s.dispatchAlertLogged);
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
            const calls = config.getNonsystemCalls ? config.getNonsystemCalls(rawVars) : [];
            for (let { runSystem, rawVars, escrowConfig } of systemCalls) {
              console.log('systemCall', runSystem, rawVars, escrowConfig);
              let processedVars;
              console.log({ runSystem, rawVars, escrowConfig });

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
                totalPrice += await customConfigs[runSystem].getPrice(processedVars);
              }
            }

            if (totalEscrow > 0n) {
              calls.unshift(System.getApproveErc20Call(
                totalEscrow, process.env.REACT_APP_STARKNET_SWAY_TOKEN, process.env.REACT_APP_STARKNET_ESCROW
              ));
            }

            if (totalPrice > 0n) {
              calls.unshift(System.getApproveErc20Call(
                totalPrice, process.env.REACT_APP_ERC20_TOKEN_ADDRESS, process.env.REACT_APP_STARKNET_DISPATCHER
              ));
            }

            console.log('execute', calls);

            // Check if we can utilize a signed session to execute calls
            const canUseSession = !!starknetSession?.account && !calls.some((c) => {
              return c.contractAddress !== process.env.REACT_APP_STARKNET_DISPATCHER || c.entrypoint !== 'run_system';
            });

            const account = canUseSession ? starknetSession : starknet.account;
            return account.execute(calls);
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
  }, [createAlert, prependEventAutoresolve, accountAddress, starknetSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const transactionWaiters = useRef([]);

  // on logout, clear pending (and failed) transactions
  useEffect(() => {
    if (!authenticated) dispatchClearTransactionHistory();
  }, [authenticated, dispatchClearTransactionHistory]);

  // on initial load, set provider.waitForTransaction for any pendingTransactions
  // so that we can throw any extension-related or timeout errors needed
  useEffect(() => {
    if (starknet?.provider && contracts && pendingTransactions?.length) {
      pendingTransactions.forEach(({ key, vars, txHash }) => {
        // (sanity check) this should not be possible since pendingTransaction should not be created
        // without txHash... so we aren't even reporting this error to user since should not happen
        if (!txHash) return dispatchPendingTransactionComplete(txHash);

        if (!transactionWaiters.current.includes(txHash)) {
          transactionWaiters.current.push(txHash);

          // NOTE: waitForTransaction is slow -- often slower than server to receive and process
          //  event and send back to frontend... so we are using it just to listen for errors
          //  (activities from backend will demonstrate success)
          starknet.provider.waitForTransaction(txHash, { retryInterval: RETRY_INTERVAL })
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
              // this somewhat commonly times out even when tx has gone through, so before reporting an error
              // check again that we have not received a related activity
              if (getTxEvent(txHash)) {
                console.warn(`txEvent already exists for "failed" tx ${txHash}`, err);
              } else {
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

  const getTxEvent = useCallback((txHash) => {
    const txHashBInt = BigInt(txHash);
    return (activities || []).find((a) => a.event?.transactionHash && BigInt(a.event?.transactionHash) === txHashBInt)?.event;
  }, [activities?.length]);

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

          starknet.provider.getTransactionReceipt(txHash)
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

  const execute = useCallback(async (key, vars, meta = {}) => {
    if (!starknet?.account || !contracts || !contracts[key]) {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Account is disconnected or contract is invalid.' },
        level: 'warning',
      });

      return;
    }

    // Check that the account isn't locked, and prompt to unlock if it is
    if (!await starknet.isPreauthorized()) {
      try {
        await starknet.enable();
      } catch (e) {
        createAlert({
          type: 'GenericAlert',
          data: { content: 'Account is unavailable.' },
          level: 'warning',
        });

        return;
      }
    }

    const { execute, onTransactionError } = contracts[key];
    setPromptingTransaction(true);

    try {
      // execute
      const tx = await execute(vars);
      dispatchPendingTransaction({
        key,
        vars,
        meta,
        timestamp: blockTime ? (blockTime * 1000) : null,
        txHash: cleanseTxHash(tx.transaction_hash),
        waitingOn: 'TRANSACTION'
      });
    } catch (e) {
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
  }, [blockTime, contracts]); // eslint-disable-line react-hooks/exhaustive-deps

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
