import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Crewmate, Inventory, Lot, Order, Permission, Product, Time } from '@influenceth/sdk';

import { BanIcon, InventoryIcon, WarningOutlineIcon, SwayIcon, MarketBuyIcon, MarketSellIcon, LimitBuyIcon, LimitSellIcon, CancelLimitOrderIcon, LocationIcon, CloseIcon } from '~/components/Icons';
import Button from '~/components/ButtonAlt';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useMarketplaceManager from '~/hooks/actionManagers/useMarketplaceManager';
import useEntity from '~/hooks/useEntity';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useOrderList from '~/hooks/useOrderList';
import useSwayBalance from '~/hooks/useSwayBalance';
import formatters from '~/lib/formatters';
import actionStages from '~/lib/actionStages';
import { reactBool, formatFixed, formatTimer, getCrewAbilityBonuses, locationsArrToObj, formatPrice } from '~/lib/utils';
import theme, { hexToRGB } from '~/theme';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  FlexSectionBlock,
  formatResourceMass,
  formatResourceVolume,
  getBonusDirection,
  MouseoverContent,
  LotInputBlock,
  InventorySelectionDialog,
  InventoryInputBlock,
  TransferDistanceDetails,
  TimeBonusTooltip,
  getTripDetails,
  FeeBonusTooltip,
  formatResourceAmount
} from './components';

const greenRGB = hexToRGB(theme.colors.green);
const redRGB = hexToRGB(theme.colors.red);

const FormSection = styled.div`
  margin-top: 12px;
  &:first-child {
    margin-top: 0px;
  }
`;

const InputLabel = styled.div`
  align-items: center;
  color: #888;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  margin-bottom: 3px;
  & > label {
    flex: 1;
  }
  & > span {
    b {
      color: white;
      font-weight: normal;
    }
  }
`;

const TotalSway = styled.span``;
const OrderAlert = styled.div`
  ${p => {
    if (p.isCancellation) {
      return `
        background: rgba(${redRGB}, 0.2);
        & > div {
          background: rgba(${redRGB}, 0.2);
          b { color: ${p.theme.colors.red}; }
        }
      `;
    }
    else if (p.mode === 'buy') {
      return `
        background: rgba(${greenRGB}, 0.2);
        & > div {
          background: rgba(${greenRGB}, 0.2);
          b { color: ${p.theme.colors.green}; }
        }
      `;
    } else {
      return `
        background: rgba(${p.theme.colors.mainRGB}, 0.2);
        & > div {
          background: rgba(${p.theme.colors.mainRGB}, 0.2);
          b { color: ${p.theme.colors.main}; }
        }
      `;
    }
  }};

  ${p => p.insufficientAssets && `
    &:before {
      content: "Insufficient ${p.mode === 'buy' ? 'Wallet Balance' : 'Product in Inventory'}";
      color: ${p.theme.colors.red};
      display: inline-block;
      margin: 3px 5px 7px;
    }

    ${TotalSway} {
      color: ${p.theme.colors.red};
    }
  `}

  ${p => p.insufficientInventory && `
    &:before {
      content: "Insufficient Inventory Capacity";
      color: ${p.theme.colors.red};
      display: inline-block;
      margin: 3px 5px 7px;
    }
  `}

  color: white;
  ${p => p.theme.clipCorner(15)};

  padding: 5px;
  width: 100%;

  & > div {
    align-items: center;
    ${p => p.theme.clipCorner(12)};
    display: flex;
    flex-direction: row;
    height: 65px;
    padding: 0 8px;
    width: 100%;

    & > div {
      padding: 0 6px;
    }

    b {
      text-transform: uppercase;
    }
  }
`;

const CompetitionSummary = styled.span`
  color: ${p => {
    if (p.matchingBest) {
      return p.theme.colors.green;
    } else if (p.notBest) {
      return p.theme.colors.red;
    } else {
      return p.theme.colors.main;
    }
  }};
  #777; theme.colors.main;
  flex: 1;
  font-size: 16px;
  & > b {
    color: white;
    font-weight: normal;
  }
`;

const TooltipHeader = styled.div`
  border-bottom: 1px solid #333;
  color: white;
  font-weight: bold;
  padding-bottom: 12px;
  text-transform: uppercase;
`;
const TooltipBody = styled.div`
  color: ${p => p.theme.colors.main};
  & label {
    color: white;
    margin-top: 15px;
    text-transform: uppercase;
    display: block;
  }
`;

const MarketplaceOrder = ({
  asteroid,
  lot,
  manager,
  stage,
  isCancellation,
  cancellationInitialCaller,
  cancellationMakerFee,
  mode,
  type,
  resourceId,
  preselect,
  ...props
}) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resource = Product.TYPES[resourceId] || {};
  const resourceByMass = !resource?.isAtomic;
  const exchange = lot.building;  // TODO: ...
  const { data: exchangeController } = useHydratedCrew(lot.building?.Control?.controller?.id);

  const { data: swayBalance } = useSwayBalance();
  
  const {
    createBuyOrder,
    createSellOrder,
    cancelBuyOrder,
    cancelSellOrder,
    fillBuyOrders,
    fillSellOrders,
    pendingOrders,

    orderStatus,
    currentOrder = {}
  } = manager;
  const { crew, crewCan } = useCrewContext();
  const { data: orders, refetch } = useOrderList(exchange, resourceId);

  const [buyOrders, sellOrders] = useMemo(() => ([
    (orders || []).filter((o) => o.orderType === Order.IDS.LIMIT_BUY),
    (orders || []).filter((o) => o.orderType === Order.IDS.LIMIT_SELL),
  ]), [orders]);

  // TODO: ...
  const currentDestinationLot = {};
  const currentOriginLot = {};
  // const { data: destination } = useEntity(destinationSelection ? { id: destinationSelection.id, label: destinationSelection.label } : undefined);
  // const destinationLotId = useMemo(() => destination && locationsArrToObj(destination?.Location?.locations || []).lotId, [destination]);
  // const { data: destinationLot } = useLot(destinationLotId);
  // const destinationInventory = useMemo(() => (destination?.Inventories || []).find((i) => i.slot === destinationSelection?.slot), [destination, destinationSelection]);
  // const { data: destinationController } = useCrew(destination?.Control?.controller?.id);

  const crewmates = currentOrder?._crewmates || crew?._crewmates || [];
  const captain = crewmates[0];

  const [hopperTransportBonus, feeReductionBonus] = useMemo(() => {
    if (!crew) return [];

    const bonusIds = [
      Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME,
      Crewmate.ABILITY_IDS.MARKETPLACE_FEE_REDUCTION,
    ];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const feeEnforcementBonus = useMemo(() => {
    if (!exchangeController) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.MARKETPLACE_FEE_ENFORCEMENT, exchangeController) || {};
  }, [exchangeController]);

  const quantityToUnits = useCallback((quantity) => resource.isAtomic ? quantity : (quantity / 1000 * resource.massPerUnit), [resource]);
  const unitsToQuantity = useCallback((units) => resource.isAtomic ? units : (1000 * units / resource.massPerUnit), [resource]);

  const [limitPrice, setLimitPrice] = useState(preselect?.limitPrice);
  const [quantity, setQuantity] = useState(unitsToQuantity(preselect?.quantity));
  const [storageSelectorOpen, setStorageSelectorOpen] = useState(false);
  const [storageSelection, setStorageSelection] = useState(
    (preselect?.storage && {
      id: preselect.storage.id,
      label: preselect.storage.label,
      slot: preselect.storageSlot
    }) || undefined
  );
  const { data: storage } = useEntity(storageSelection ? { id: storageSelection.id, label: storageSelection.label } : undefined);
  const storageLotId = useMemo(() => storage && locationsArrToObj(storage?.Location?.locations || []).lotId, [storage]);
  const { data: storageLot } = useLot(storageLotId);
  const storageInventory = useMemo(() => (storage?.Inventories || []).find((i) => i.slot === storageSelection?.slot), [storage, storageSelection]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    return getTripDetails(asteroid.id, hopperTransportBonus, crew?._location?.lotIndex, [
      { label: 'Travel to Marketplace', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crew?._location?.lotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, hopperTransportBonus]);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!asteroid?.id || !exchange?.id || !storageLot?.id) return [0, 0];
    const exchangeLotIndex = Lot.toIndex(exchange?.Location?.location?.id);
    const storageLotIndex = Lot.toIndex(storageLot?.id);
    const transportDistance = Asteroid.getLotDistance(asteroid?.id, exchangeLotIndex, storageLotIndex);
    const transportTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroid?.id, exchangeLotIndex, storageLotIndex, hopperTransportBonus?.totalBonus),
      crew?._timeAcceleration
    );
    return [transportDistance, transportTime];
  }, [asteroid?.id, exchange?.id, storageLot?.id, hopperTransportBonus, crew?._timeAcceleration]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [
      type === 'market' ? 0 : (Math.max(crewTravelTime / 2, transportTime) + crewTravelTime / 2),
      0
    ];
  }, [transportTime, crewTravelTime, type]);

  // TODO: probably make this a shared util (w/ depth chart)
  const [totalMarketPrice, avgMarketPrice, averagedOrderTally, marketFills] = useMemo(() => {
    let total = 0;
    let totalOrders = 0;
    let needed = quantity;
    let marketFills = [];
    const paymentFunc = mode === 'buy' ? Order.getFillSellOrderPayments : Order.getFillBuyOrderWithdrawals;
    const priceSortMult = mode === 'buy' ? 1 : -1;
    const orders = []
      .concat(mode === 'buy' ? sellOrders : buyOrders)
      .sort((a, b) => a.price === b.price ? a.validTime - b.validTime : (priceSortMult * (a.price - b.price)));
    orders.every((order) => {
      const { amount, price } = order;
      const levelAmount = Math.min(needed, amount);
      const levelValue = levelAmount * price;
      total += levelValue;
      needed -= levelAmount;
      if (levelAmount > 0) {
        marketFills.push({
          ...order,
          fillAmount: levelAmount,
          paymentsE6: paymentFunc(
            levelValue * 1e6,
            order.makerFee,
            exchange.Exchange.takerFee,
            feeReductionBonus?.totalBonus,
            feeEnforcementBonus?.totalBonus
          )
        });
        totalOrders++;
        return true;
      }
      return false;
    });
    return [total, total / quantity, totalOrders, marketFills];
  }, [buyOrders, exchange, feeEnforcementBonus, feeReductionBonus, mode, quantity, sellOrders, type]);

  const totalLimitPrice = useMemo(() => {
    return (limitPrice || 0) * quantity;
  }, [limitPrice, quantity]);

  // maker = limit order
  // taker = market order
  const feeRate = useMemo(
    () => (
      cancellationMakerFee || Order.adjustedFee(
        exchange?.Exchange?.[type === 'market' ? 'takerFee' : 'makerFee'],
        feeReductionBonus?.totalBonus,
        feeEnforcementBonus?.totalBonus
      )
    ) / Order.FEE_SCALE,
    [exchange, feeEnforcementBonus, feeReductionBonus, type]
  );

  const feeTotal = useMemo(
    () => Math.floor(feeRate * (type === 'market' ? totalMarketPrice : totalLimitPrice)),
    [feeRate, totalLimitPrice, totalMarketPrice, type]
  );

  const stats = useMemo(() => {
    const baseFeeRate = exchange?.Exchange?.[type === 'limit' ? 'makerFee' : 'takerFee'] / Order.FEE_SCALE;
    return [
      (isCancellation
        ? undefined
        : {
          label: type === 'limit' ? 'Maker Fee' : 'Taker Fee',
          value: <><SwayIcon /> {feeTotal.toLocaleString()} ({formatFixed(100 * feeRate, 1)}%)</>,
          direction: feeRate === baseFeeRate ? 0 : (feeRate > baseFeeRate ? -1 : 1),
          isTimeStat: true, // (to reverse direction of good/bad)
          tooltip: feeRate !== baseFeeRate && (
            <FeeBonusTooltip
              baseFeeRate={baseFeeRate}
              bonusedFeeRate={feeRate}
              feeEnforcementBonus={feeEnforcementBonus}
              feeReductionBonus={feeReductionBonus}
              title="Fee Calculation" />
          )
        }
      ),
      ((isCancellation || type === 'market')
        ? undefined // TODO: could add an "orders filled" stat here
        : {
          label: 'Crew Travel Time',
          value: formatTimer(crewTravelTime),
          direction: getBonusDirection(hopperTransportBonus),
          isTimeStat: true,
          tooltip: (
            <TimeBonusTooltip
              bonus={hopperTransportBonus}
              title="Travel Time"
              totalTime={crewTravelTime}
              crewRequired="start" />
          )
        }
      ),
      (isCancellation
        ? undefined
        : {
          label: 'Product Transport Time',
          value: formatTimer(transportTime),
          direction: getBonusDirection(hopperTransportBonus),
          isTimeStat: true,
          tooltip: (
            <TimeBonusTooltip
              bonus={hopperTransportBonus}
              title="Transport Time"
              totalTime={transportTime}
              crewRequired="start" />
          )
        }
      ),
      {
        label: 'Order Mass',
        value: formatResourceMass(quantity, resourceId),
        direction: 0,
      },
      {
        label: 'Order Volume',
        value: formatResourceVolume(quantity, resourceId),
        direction: 0,
      },
    ];
  }, [feeTotal, quantity, transportTime, crewTravelTime, hopperTransportBonus, resourceId]);

  // handle "currentOrder" state
  useEffect(() => {
    if (currentOrder) {
      // TODO: make selections
    }
  }, [currentOrder]);

  const tooltipRefEl = useRef();

  const [tooltipVisible, setTooltipVisible] = useState();

  const totalForBuy = useMemo(() => {
    return (buyOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [buyOrders]);

  const totalForSale = useMemo(() => {
    return (sellOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [sellOrders]);

  const onSubmitOrder = useCallback(() => {
    if (isCancellation) {
      if (mode === 'buy') {
        cancelBuyOrder({
          amount: quantityToUnits(quantity),
          buyer: { id: crew?.id, label: crew?.label },
          price: limitPrice,
          product: resourceId,
          destination: { id: storage?.id, label: storage?.label },
          destinationSlot: storageInventory?.slot,
          initialCaller: cancellationInitialCaller,
          makerFee: cancellationMakerFee
        })
      } else {
        cancelSellOrder({
          amount: quantityToUnits(quantity),
          seller: { id: crew?.id, label: crew?.label },
          product: resourceId,
          price: limitPrice,
          origin: { id: storage?.id, label: storage?.label },
          originSlot: storageInventory?.slot,
        })
      }
    }
    else if (type === 'market') {
      if (mode === 'buy') {
        fillSellOrders({
          destination: { id: storage?.id, label: storage?.label },
          destinationSlot: storageInventory?.slot,
          fillOrders: marketFills || [],
          product: resourceId
        })
      } else {
        fillBuyOrders({
          origin: { id: storage?.id, label: storage?.label },
          originSlot: storageInventory?.slot,
          fillOrders: marketFills || [],
          product: resourceId
        })
      }
    }
    else {
      const vars = {
        product: resourceId,
        amount: quantityToUnits(quantity),
        price: limitPrice
      };
      if (mode === 'buy') {
        createBuyOrder({
          ...vars,
          destination: { id: storage?.id, label: storage?.label },
          destinationSlot: storageInventory?.slot,
          feeTotal
        });
      } else {
        createSellOrder({
          ...vars,
          origin: { id: storage?.id, label: storage?.label },
          originSlot: storageInventory?.slot
        });
      }
    }
  }, [cancellationInitialCaller, feeTotal, limitPrice, marketFills, quantity, quantityToUnits, resourceId, storage, storageInventory]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (lastStatus.current && orderStatus !== lastStatus.current) {
      props.onClose();
    }
    lastStatus.current = orderStatus;
  }, [orderStatus]);

  const handleChangeQuantity = useCallback((e) => {
    let input = parseInt(e.currentTarget.value) || 0;
    if (input && type === 'market') {
      if (mode === 'buy') input = Math.max(0, Math.min(input, totalForSale));
      if (mode === 'sell') input = Math.max(0, Math.min(input, totalForBuy));
    }
    // TODO: set limits for limit orders
    setQuantity(input);
  }, [mode, totalForSale, totalForBuy, type]);

  const handleChangeLimitPrice = useCallback((e) => {
    setLimitPrice(Number(e.currentTarget.value));
  }, []);

  const matchBestLimitOrder = useCallback((e) => {
    if (mode === 'buy') {
      setLimitPrice(buyOrders[0].price);
    } else {
      setLimitPrice(sellOrders[sellOrders.length - 1].price);
    }
  }, [mode, buyOrders, sellOrders]);

  const handleOrderRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const [competingOrderTally, betterOrderTally, bestOrderPrice] = useMemo(() => {
    if (mode === 'buy') {
      return [
        buyOrders.length,
        buyOrders.filter((o) => o.price > limitPrice).length,
        buyOrders.reduce((acc, cur) => Math.max(acc, cur.price), 0)
      ];
    }
    return [
      sellOrders.length,
      sellOrders.filter((o) => o.price < limitPrice).length,
      sellOrders.reduce((acc, cur) => Math.min(acc, cur.price), Infinity)
    ];
  }, [buyOrders, mode, sellOrders, limitPrice]);
  
  const exceedsOtherSide = useMemo(() => {
    if (mode === 'buy') {
      return limitPrice >= sellOrders?.[sellOrders?.length - 1]?.price;
    } else {
      return limitPrice <= buyOrders?.[0]?.price;
    }
  }, [mode, limitPrice, buyOrders, sellOrders]);
  
  const total = useMemo(() => {
    let sum = type === 'limit' ? totalLimitPrice : totalMarketPrice;
    return sum + (mode === 'buy' ? feeTotal : -feeTotal);
  }, [feeTotal, mode, totalLimitPrice, totalMarketPrice, type]);

  const dialogAction = useMemo(() => {
    let a = {};
    if (type === 'market' && mode === 'buy') {
      a.icon = <MarketBuyIcon />;
      a.label = 'Market Buy';
    } else if (type === 'market' && mode === 'sell') {
      a.icon = <MarketSellIcon />;
      a.label = 'Market Sell';
    } else if (type === 'limit' && mode === 'buy') {
      a.icon = <LimitBuyIcon />;
      a.label = 'Limit Buy';
    } else if (type === 'limit' && mode === 'sell') {
      a.icon = <LimitSellIcon />;
      a.label = 'Limit Sell';
    }
    if (isCancellation) {
      a.icon = <CancelLimitOrderIcon />;
      a.label = `Cancel ${a.label}`;
    }
    return a;
  }, [mode, type, isCancellation]);

  const goLabel = useMemo(() => {
    if (isCancellation) return `Cancel Order`;
    if (type === 'market') return `Submit Order`;
    else return `Create Order`;
  }, [type, isCancellation]);

  const amountInInventory = useMemo(() => {
    return (storageInventory?.contents || []).find((c) => Number(c.product) === Number(resourceId))?.amount || 0;
  }, [storageInventory, resourceId]);

  const insufficientAssets = useMemo(() => {
    if (mode === 'buy') {
      return total > swayBalance;
    } else {
      return quantityToUnits(quantity) > amountInInventory;
    }
  }, [mode, quantity, amountInInventory, swayBalance, total]);

  const insufficientCapacity = useMemo(() => {
    if (mode === 'buy' && storageInventory) {
      const buyUnits = quantityToUnits(quantity);
      const buyMass = buyUnits * resource.massPerUnit;
      const buyVolume = buyUnits * resource.volumePerUnit;
      const invConfig = Inventory.getType(storageInventory.inventoryType, crew?._inventoryBonuses) || {};
      if (storageInventory.mass + storageInventory.reservedMass + buyMass > invConfig.massConstraint) return true;
      if (storageInventory.volume + storageInventory.reservedVolume + buyVolume > invConfig.volumeConstraint) return true;
      if (invConfig.productConstraints) {
        if (!invConfig.productConstraints[resourceId]) return true;
        if (invConfig.productConstraints[resourceId] > 0 && amountInInventory + buyUnits > invConfig.productConstraints[resourceId]) return true;
      }
    }
    return false;
  }, [amountInInventory, crew?._inventoryBonuses, mode, quantity, storageInventory]);

  const isPermitted = useMemo(() => {
    let perm = 0;
    if (isCancellation) return true;
    if (type === 'limit' && mode === 'buy') perm = Permission.IDS.LIMIT_BUY;
    if (type === 'limit' && mode === 'sell') perm = Permission.IDS.LIMIT_SELL;
    if (type === 'market' && mode === 'buy') perm = Permission.IDS.BUY;
    if (type === 'market' && mode === 'sell') perm = Permission.IDS.SELL;
    return crewCan(perm, exchange);
  }, [crewCan, exchange, mode, type, isCancellation]);
  
  return (
    <>
      <ActionDialogHeader
        action={dialogAction}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection>
          <LotInputBlock
            title="Marketplace"
            lot={lot}
            disabled
          />

          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Order Details"
            image={<ResourceThumbnail resource={resource} tooltipContainer="none" />}
            label={resource?.name}
            disabled
            sublabel={resource?.classification}
            bodyStyle={{ background: 'transparent' }}
          />
        </FlexSection>

        <FlexSection>
          <InventoryInputBlock
            title={mode === 'buy' ? 'Deliver To' : 'Source From'}
            titleDetails={<TransferDistanceDetails distance={transportDistance} crewTravelBonus={hopperTransportBonus} />}
            disabled={isCancellation || stage !== actionStages.NOT_STARTED}
            entity={storage}
            inventorySlot={storageInventory?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
            imageProps={{ iconOverride: <InventoryIcon /> }}
            isSelected={!isCancellation && stage === actionStages.NOT_STARTED}
            onClick={() => setStorageSelectorOpen(true)}
            sublabel={
              storageLot
              ? <><LocationIcon /> {formatters.lotName(storageLot?.id)}</>
              : 'Inventory'
            } />

          <FlexSectionSpacer />

          <FlexSectionBlock style={{ alignSelf: 'flex-start', marginTop: -10 }} bodyStyle={{ padding: '0 0 0 8px' }}>
            <FormSection>
              <InputLabel>
                <label>{type === 'market' ? '' : 'Max'} Quantity</label>
                {type === 'market' && (
                  <span>Max <b>{((mode === 'buy' ? totalForSale : totalForBuy) || 0).toLocaleString()}{resourceByMass ? ' kg' : ''}</b></span>
                )}
                {type === 'limit' && mode === 'sell' && (
                  <span>In Inventory <b>{formatResourceAmount(amountInInventory || 0, resourceId)}</b></span>
                )}
              </InputLabel>
              <TextInputWrapper rightLabel={resourceByMass ? ' kg' : ''}>
                <UncontrolledTextInput
                  disabled={isCancellation || stage !== actionStages.NOT_STARTED}
                  min={0}
                  max={type === 'market' ? (mode === 'buy' ? totalForSale : totalForBuy) : (mode === 'sell' ? amountInInventory : undefined)}
                  onChange={handleChangeQuantity}
                  placeholder="Specify Quantity"
                  step={1}
                  type="number"
                  value={quantity || ''} />
              </TextInputWrapper>
            </FormSection>

            <FormSection>
              <InputLabel>
                <label>At {type === 'market' ? 'Market' : 'Limit'} Price</label>
              </InputLabel>
              <TextInputWrapper rightLabel={`SWAY / ${resourceByMass ? 'kg' : 'unit'}`}>
                <UncontrolledTextInput
                  disabled={isCancellation || type === 'market' || stage !== actionStages.NOT_STARTED}
                  style={type === 'market' ? { backgroundColor: '#09191f' } : {}}
                  min={0}
                  onChange={handleChangeLimitPrice}
                  type="number"
                  value={type === 'market' ? formatPrice(avgMarketPrice) : limitPrice} />
              </TextInputWrapper>
            </FormSection>

            {stage === actionStages.NOT_STARTED && (
              <FormSection style={{ marginTop: 10 }}>
                {isCancellation && (
                  <InputLabel style={{ color: theme.colors.error, opacity: 0.75 }}><CloseIcon /> Order Cancellation</InputLabel>
                )}
                {!isCancellation && type === 'market' && (
                  <InputLabel>
                    <span style={{ flex: 1 }}>
                      Average Price from: <b>{' '}{(averagedOrderTally || 0).toLocaleString()} {mode === 'buy' ? 'Seller' : 'Buyer'}{averagedOrderTally === 1 ? '' : 's'}</b>
                    </span>
                    <Button onClick={handleOrderRefresh} size="small" subtle>Refresh</Button>
                  </InputLabel>
                )}
                {!isCancellation && type === 'limit' && (
                  <InputLabel>
                    <CompetitionSummary mode={mode} matchingBest={limitPrice === bestOrderPrice} notBest={exceedsOtherSide || betterOrderTally > 0}>
                      {mode === 'buy' && (
                        <>
                          {exceedsOtherSide ? `Exceeds Sell Side` : ''}
                          {!exceedsOtherSide && limitPrice > bestOrderPrice ? `Current Highest` : ''}
                          {limitPrice === bestOrderPrice ? `Equal to Highest` : ''}
                          {betterOrderTally > 0 ? <>Lower than <b>{betterOrderTally} Buyer{betterOrderTally === 1 ? '' : 's'}</b></> : ''}
                        </>
                      )}
                      {mode === 'sell' && (
                        <>
                          {exceedsOtherSide ? `Exceeds Buy Side` : ''}
                          {!exceedsOtherSide && limitPrice < bestOrderPrice && `Current Lowest`}
                          {limitPrice === bestOrderPrice && `Equal to Lowest`}
                          {betterOrderTally > 0 ? <>Higher than <b>{betterOrderTally} Sellers{betterOrderTally === 1 ? '' : 's'}</b></> : ''}
                        </>
                      )}
                    </CompetitionSummary>

                    <Button
                      disabled={limitPrice === bestOrderPrice}
                      onClick={matchBestLimitOrder}
                      size="small"
                      subtle>Match</Button>
                  </InputLabel>
                )}
              </FormSection>
            )}
          </FlexSectionBlock>

        </FlexSection>

        <FlexSection>

          <FlexSectionBlock
            title="Order"
            bodyStyle={{ height: 'auto', padding: 0 }}
            style={{ width: '100%' }}>
            <OrderAlert
              mode={mode}
              insufficientAssets={reactBool(insufficientAssets)}
              insufficientInventory={reactBool(insufficientCapacity)}
              isCancellation={reactBool(isCancellation)}>
              <div>
                {type === 'limit' && (
                  <div style={{ fontSize: '35px', lineHeight: '30px' }}>
                    <b>{isCancellation ? <BanIcon /> : <WarningOutlineIcon />}</b>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div><b>{isCancellation ? 'Cancel ': ''}{type} {mode}</b></div>
                  <div>
                    <b>{type === 'limit' ? (isCancellation ? 'Unfilled ' : 'Up to ') : ''}</b>
                    {resourceByMass ? formatResourceMass(quantity || 0, resourceId) : quantity.toLocaleString()}
                    {' '}{resource.name}
                  </div>
                </div>
                <div
                  ref={tooltipRefEl}
                  onMouseEnter={() => setTooltipVisible(true)}
                  onMouseLeave={() => setTooltipVisible(false)}
                  style={{ alignItems: 'flex-end', display: 'flex' }}>
                  <b>
                    {type === 'market' && 'Total'}
                    {type === 'limit' && mode === 'buy' && (isCancellation ? 'Escrow Unlocked' : 'Spend up to')}
                    {type === 'limit' && mode === 'sell' && (isCancellation ? 'All Items Returned' : 'Receive up to')}
                  </b>
                  {!(type === 'limit' && mode === 'sell' && isCancellation) && (
                    <span style={{ display: 'inline-flex', fontSize: '35px', lineHeight: '30px' }}>
                      <SwayIcon /> <TotalSway>{type === 'market' && (mode === 'buy' ? '-' : '+')}{formatFixed(total || 0)}</TotalSway>
                    </span>
                  )}
                </div>
              </div>
            </OrderAlert>

            {type === 'limit' && (
              <MouseoverInfoPane referenceEl={tooltipRefEl.current} visible={tooltipVisible}>
                <MouseoverContent>
                  <TooltipHeader>limit {mode}</TooltipHeader>
                  <TooltipBody>
                    <div>
                      <label>{mode === 'buy' ? 'Sway Escrow' : 'Escrow of Goods'} </label>
                      <span>
                        {mode === 'buy'
                          ? `The specified buy total is deducted from your wallet and held in escrow until the order is filled or cancelled.`
                          : `The specified quantity of goods will be held at the marketplace until the order is filled or cancelled.`
                        }
                      </span>
                    </div>
                    <div>
                      <label>Partial Fills</label>
                      <span>The entire order may not fill at once. Select your open orders to see the amount left unfilled.</span>
                    </div>
                  </TooltipBody>
                </MouseoverContent>
              </MouseoverInfoPane>
            )}

          </FlexSectionBlock>

        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
          wide
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={
          !isCancellation && (
            !storageSelection || !quantity || !total
            || exceedsOtherSide || insufficientAssets || insufficientCapacity
            || !isPermitted
          )
        }
        goLabel={goLabel}
        onGo={onSubmitOrder}
        stage={stage}
        waitForCrewReady
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <InventorySelectionDialog
          asteroidId={asteroid.id}
          otherEntity={exchange}
          onClose={() => setStorageSelectorOpen(false)}
          onSelected={setStorageSelection}
          open={storageSelectorOpen}
          isSourcing={reactBool(mode === 'sell')}
          itemIds={[resourceId]}
          requirePresenceOfItemIds={reactBool(mode === 'sell')}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const manager = useMarketplaceManager(lot?.building?.id);
  const pendingOrder = manager.getPendingOrder(props.mode, props.type, { exchange: lot.building, product: props.resourceId });
  const actionStage = pendingOrder ? actionStages.STARTING : actionStages.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && actionStage !== lastStatus.current) {
      if (props.onClose) props.onClose();
    }
    lastStatus.current = actionStage;
  }, [actionStage]);

  // TODO: actionImage
  return (
    <ActionDialogInner
      actionImage="Marketplace"
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <MarketplaceOrder
        asteroid={asteroid}
        lot={lot}
        manager={manager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
