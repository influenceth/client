import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { Building, Product } from '@influenceth/sdk';

import marketplaceBackground from '~/assets/images/modal_headers/Marketplace.png';
import { BanIcon, InventoryIcon, LocationIcon, WarningOutlineIcon, OrderIcon, SwayIcon, MarketBuyIcon, MarketSellIcon, LimitBuyIcon, LimitSellIcon, CancelLimitOrderIcon } from '~/components/Icons';
import Button from '~/components/ButtonAlt';
import useCrewContext from '~/hooks/useCrewContext';
import useExtractionManager from '~/hooks/useExtractionManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import UncontrolledTextInput, { TextInputWrapper } from '~/components/TextInputUncontrolled';
import actionStages from '~/lib/actionStages';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';
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
  BuildingImage,
  ProgressBarSection,
  ProgressBarNote,
  FlexSectionBlock,
  TransferDistanceDetails,
  formatResourceMass,
  formatResourceVolume,
  EmptyBuildingImage,
  DestinationSelectionDialog,
  BonusTooltip,
  getBonusDirection,
  MouseoverContent
} from './components';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';

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

  ${p => p.insufficientBalance && `
    &:before {
      content: "Insufficient Wallet Balance";
      color: ${p.theme.colors.red};
      display: inline-block;
      margin: 3px 5px 7px;
    }

    ${TotalSway} {
      color: ${p.theme.colors.red};
    }
  `}

  color: white;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 15px),
    calc(100% - 15px) 100%,
    0 100%
  );
  
  padding: 5px;
  width: 100%;
  
  & > div {
    align-items: center;
    clip-path: polygon(
      0 0,
      100% 0,
      100% calc(100% - 12px),
      calc(100% - 12px) 100%,
      0 100%
    );
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

const MarketplaceOrder = ({ asteroid, lot, manager, stage, ...props }) => {
  const { isCancellation, mode, type, resourceId, preselect } = props;

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const resource = Product.TYPES[resourceId] || {};
  const resourceByMass = resource?.massPerUnit === 0.001;
  
  const { currentLaunch, launchStatus, startLaunch } = manager;

  const { crew, crewMemberMap } = useCrewContext();
  const { data: currentDestinationLot } = useLot(asteroid.i, currentLaunch?.destinationLotId);

  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);
  const [limitPrice, setLimitPrice] = useState(preselect?.limitPrice);
  const [quantity, setQuantity] = useState(preselect?.quantity);

  const crewMembers = currentLaunch?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const launchBonus = 0;

  const tooltipRefEl = useRef();

  const [buyOrders, setBuyOrders] = useState([]);
  const [sellOrders, setSellOrders] = useState([]);
  const [tooltipVisible, setTooltipVisible] = useState();
  
  const marketplaceFee = 0.05;  // TODO: ...
  
  // TODO: presumably these will come from useQuery and don't
  //  need to be in local state like this
  useEffect(() => {
    setBuyOrders(
      [
        { price: 110, amount: 71 },
        { price: 140, amount: 71 },
        { price: 170, amount: 71 },
        { price: 180, amount: 71 },
        { price: 190, amount: 71 },
        { price: 200, amount: 71 },
        { price: 210, amount: 200 },
        { price: 240, amount: 140 },
        { price: 245, amount: 10 },
        { price: 259, amount: 350 },
        { price: 300, amount: 50 },
        { price: 305, amount: 90 },
      ].sort((a, b) => a.price > b.price ? -1 : 1)
    );
    setSellOrders(
      [
        { price: 370, amount: 369 },
        { price: 327, amount: 16 },
        { price: 317, amount: 80 },
      ].sort((a, b) => a.price > b.price ? -1 : 1)
    );
  }, []);

  useEffect(() => {
    if (currentDestinationLot) {
      setDestinationLot(currentDestinationLot);
    }
  }, [currentDestinationLot]);

  const totalForBuy = useMemo(() => {
    return (buyOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [buyOrders]);

  const totalForSale = useMemo(() => {
    return (sellOrders || []).reduce((acc, cur) => acc + cur.amount, 0);
  }, [sellOrders]);

  const onSubmitOrder = useCallback(() => {
    startLaunch();
  }, []);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY', 'READY_TO_FINISH', 'FINISHING'].includes(lastStatus.current)) {
      if (launchStatus !== lastStatus.current) {
        console.log('on Close');
        props.onClose();
      }
    }
    lastStatus.current = launchStatus;
  }, [launchStatus]);

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

  const [totalMarketPrice, avgMarketPrice, averagedOrderTally] = useMemo(() => {
    let total = 0;
    let totalOrders = 0;
    let needed = quantity;
    const orders = []
      .concat(mode === 'buy' ? sellOrders : buyOrders)
      .sort((a, b) => (mode === 'buy' ? 1 : -1) * (a.price - b.price));
    orders.every(({ price, amount }) => {
      const levelAmount = Math.min(needed, amount);
      total += levelAmount * price;
      needed -= levelAmount;
      if (levelAmount > 0) {
        totalOrders++;
        return true;
      }
      return false;
    });
    return [total, total / quantity, totalOrders];
  }, [buyOrders, mode, quantity, sellOrders]);

  const totalLimitPrice = useMemo(() => {
    return (limitPrice || 0) * quantity;
  }, [limitPrice, quantity]);

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

  const fee = useMemo(() => {
    return (type === 'market' ? totalMarketPrice : totalLimitPrice)
      * marketplaceFee;
  }, [marketplaceFee, totalMarketPrice, totalLimitPrice, type]);

  const total = useMemo(() => {
    let sum = type === 'limit' ? totalLimitPrice : totalMarketPrice;
    return sum + (mode === 'buy' ? fee : -fee);
  }, [fee, mode, totalLimitPrice, totalMarketPrice, type]);

  const marketplaceBonus = getCrewAbilityBonus(2, crewMembers); // TODO: not 2

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel Time',
      value: formatTimer(0),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Marketplace Fee',
      value: (fee || 0).toLocaleString(),
      direction: 0,
      direction: marketplaceBonus.totalBonus > 1 ? getBonusDirection(marketplaceBonus) : 0,
      tooltip: marketplaceBonus.totalBonus > 1 && (
        <BonusTooltip
          bonus={marketplaceBonus}
          title="Marketplace Fee"
          titleValue={`${(fee || 0).toLocaleString()}`} />
      )
    },
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
  ]), [fee, quantity, marketplaceBonus, resourceId]);

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

  const insufficientBalance = false;  // TODO: ...

  return (
    <>
      <ActionDialogHeader
        action={dialogAction}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={0}
        taskCompleteTime={0}
        onClose={props.onClose}
        stage={stage}
        wide />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Marketplace"
            image={<BuildingImage building={Building.TYPES[lot?.building?.capableType || 0]} />}
            label={`${lot?.building?.name || Building.TYPES[lot?.building?.capableType || 0].name}`}
            disabled
            sublabel={`Lot #${lot?.i}`}
          />

          <FlexSectionSpacer />

          <FlexSectionInputBlock
            title="Order Details"
            image={<ResourceThumbnail resource={resource} tooltipContainer="none" />}
            label={resource?.name}
            disabled
            sublabel="Finished Good"
            bodyStyle={{ background: 'transparent' }}
          />
        </FlexSection>

        <FlexSection>
          <FlexSectionInputBlock
            title={`Delivery ${mode === 'buy' ? 'To' : 'From'}`}
            image={
              destinationLot
                ? (
                  <BuildingImage
                    building={Building.TYPES[destinationLot.building?.capableType || 0]}
                    inventories={destinationLot?.building?.inventories}
                    showInventoryStatusForType={1} />
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            isSelected={stage === actionStages.NOT_STARTED}
            label={destinationLot ? (destinationLot.building?.name || Building.TYPES[destinationLot.building?.capableType || 0]?.name) : 'Select'}
            onClick={() => setDestinationSelectorOpen(true)}
            disabled={stage !== actionStages.NOT_STARTED}
            sublabel={destinationLot ? <><LocationIcon /> Lot {destinationLot.i.toLocaleString()}</> : 'Inventory'}
          />

          <FlexSectionSpacer />

          <FlexSectionBlock style={{ alignSelf: 'flex-start', marginTop: -10 }} bodyStyle={{ padding: '0 0 0 8px' }}>
            <FormSection>
              <InputLabel>
                <label>{type === 'market' ? '' : 'Max'} Quantity</label>
                {type === 'market' && (
                  <span>Max <b>{((mode === 'buy' ? totalForSale : totalForBuy) || 0).toLocaleString()}{resourceByMass ? ' kg' : ''}</b></span>
                )}
              </InputLabel>
              <TextInputWrapper rightLabel={resourceByMass ? ' kg' : ''}>
                <UncontrolledTextInput
                  disabled={stage !== actionStages.NOT_STARTED}
                  min={0}
                  max={type === 'market' ? (mode === 'buy' ? totalForSale : totalForBuy) : undefined}
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
                  disabled={type === 'market' || stage !== actionStages.NOT_STARTED}
                  style={type === 'market' ? { backgroundColor: '#09191f' } : {}}
                  min={0}
                  onChange={handleChangeLimitPrice}
                  type="number"
                  value={type === 'market' ? avgMarketPrice.toLocaleString() : limitPrice} />
              </TextInputWrapper>
            </FormSection>

            {stage === actionStages.NOT_STARTED && (
              <FormSection style={{ marginTop: 10 }}>
                {type === 'market' && (
                  <InputLabel>
                    <span style={{ flex: 1 }}>
                      Average Price from: <b>{' '}{(averagedOrderTally || 0).toLocaleString()} {mode === 'buy' ? 'Seller' : 'Buyer'}{averagedOrderTally === 1 ? '' : 's'}</b>
                    </span>
                    <Button onClick={() => {/* TODO: ... */}} size="small" subtle>Refresh</Button>
                  </InputLabel>
                )}
                {type === 'limit' && (
                  <InputLabel>
                    <CompetitionSummary mode={mode} matchingBest={limitPrice === bestOrderPrice} notBest={betterOrderTally > 0}>
                      {mode === 'buy' && (
                        <>
                          {limitPrice > bestOrderPrice ? `Current Highest` : ''}
                          {limitPrice === bestOrderPrice ? `Equal to Highest` : ''}
                          {betterOrderTally > 0 ? <>Lower than <b>{betterOrderTally} Buyer{betterOrderTally === 1 ? '' : 's'}</b></> : ''}
                        </>
                      )}
                      {mode === 'sell' && (
                        <>
                          {limitPrice < bestOrderPrice && `Current Lowest`}
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
              insufficientBalance={insufficientBalance || undefined}
              isCancellation={isCancellation || undefined}>
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

        {stage !== actionStages.NOT_STARTED && null /* TODO: (
          <ProgressBarSection
            completionTime={lot?.building?.construction?.completionTime}
            startTime={lot?.building?.construction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + constructionTime}
          />
        )*/}

        <ActionDialogStats
          stage={stage}
          stats={stats}
          wide
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={false/* TODO: no destination selected, amount invalid, price too much, etc */}
        goLabel={goLabel}
        onGo={onSubmitOrder}
        stage={stage}
        wide
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <DestinationSelectionDialog
          asteroid={asteroid}
          originLotId={lot?.i}
          initialSelection={undefined/* TODO: if only one warehouse, use it... */}
          onClose={() => setDestinationSelectorOpen(false)}
          onSelected={setDestinationLot}
          open={destinationSelectorOpen}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  // TODO: ...
  // const extractionManager = useExtractionManager(asteroid?.i, lot?.i);
  // const { actionStage } = extractionManager;
  const manager = {};
  const actionStage = actionStages.NOT_STARTED;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // TODO: actionImage
  return (
    <ActionDialogInner
      actionImage={marketplaceBackground}
      isLoading={isLoading}
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
