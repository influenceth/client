import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crew, Crewmate, Lot, Permission, Product, Time } from '@influenceth/sdk';
import styled from 'styled-components';

import { AddRationsIcon, ForwardIcon, InventoryIcon, RouteIcon, SwayIcon, WarningIcon, StopwatchIcon, FoodIcon } from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses, formatFixed } from '~/lib/utils';
import {
  ItemSelectionSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  formatMass,
  formatVolume,
  getBonusDirection,
  TimeBonusTooltip,
  FlexSectionSpacer,
  ActionDialogBody,
  FlexSection,
  TransferSelectionDialog,
  ProgressBarSection,
  ActionDialogTabs,
  InventoryChangeCharts,
  TransferDistanceDetails,
  FlexSectionBlock,
  WarningAlert,
  InventorySelectionDialog,
  CrewInputBlock,
  MiniBarChart,
  formatResourceMass,
  MultiSourceInputBlock,
  OrderSelectionDialog,
} from './components';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import useEntity from '~/hooks/useEntity';
import useFeedCrewManager from '~/hooks/actionManagers/useFeedCrewManager';
import useAsteroid from '~/hooks/useAsteroid';
import useBlockTime from '~/hooks/useBlockTime';
import { TOKEN, TOKEN_SCALE } from '~/lib/priceUtils';
import useCrew from '~/hooks/useCrew';

const PseudoStatRow = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  & > label {
    flex: 1;
  }
  & > span {
    color: white;
    font-weight: bold;
    white-space: nowrap;
  }
`;

const UnderLabel = styled.span`
  overflow: hidden;
  text-align: center;
  width: 25%;

  &:first-child {
    text-align: left;
  }
  &:last-child {
    text-align: right;
  }
  & span {
    color: ${theme.colors.secondaryText};
  }
`;

const RationingPenalty = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 4px 0 8px;
  color: white;
  font-size: 14px;
  & > label {
    flex: 1;
  }
  & > span {
    font-weight: bold;
    white-space: nowrap;
  }
  & > svg {
    font-size: 16px;
    margin-right: 6px;
  }
`;

const TimeUntilRationing = styled(RationingPenalty)`
  & > svg {
    margin-right: 4px;
    font-size: 18px;
  }
`;

const FoodMiniBar = ({ currentFood, addingFood, barColor, deltaValue, maxFood, postValue }) => (
  <MiniBarChart
    color={barColor}
    label="Food Capacity"
    valueStyle={{ color: barColor, fontWeight: 'bold' }}
    valueLabel={`${formatFixed(100 * (postValue || 0), 1)}%`}
    value={postValue}
    deltaColor={barColor}
    deltaValue={deltaValue}
    underLabels={(
      <>
        <UnderLabel style={{ color: barColor }}>
          {deltaValue === 0 ? <>{formatResourceMass(currentFood, Product.IDS.FOOD)}</> : <>{formatResourceMass(currentFood + addingFood, Product.IDS.FOOD)}</>}
        </UnderLabel>
        <UnderLabel style={{ color: theme.colors.secondaryText }}>50%</UnderLabel>
        <UnderLabel style={{ color: 'white' }}><span>Max: </span>{formatResourceMass(maxFood, Product.IDS.FOOD)}</UnderLabel>
      </>
    )}
  />
);

const FeedCrew = ({
  asteroid,
  feedCrewManager,
  stage,
  ...props
}) => {
  const { currentFeeding, feedCrew } = feedCrewManager;
  const { crew, crewCan } = useCrewContext();
  const blockTime = useBlockTime();

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const crewDistBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.FREE_TRANSPORT_DISTANCE, crew) || {};
  }, [crew]);

  const [tab, setTab] = useState(0);
  const [inventorySelectorOpen, setInventorySelectorOpen] = useState(false);
  const [exchangeSelectorOpen, setExchangeSelectorOpen] = useState();
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  // get origin* data
  const [inventorySelection, setInventorySelection] = useState(
    (currentFeeding && currentFeeding.vars?.origin && currentFeeding.vars?.origin_slot && {
      id: currentFeeding.vars?.origin?.id,
      label: currentFeeding.vars?.origin?.label,
      slot: currentFeeding.vars?.origin_slot,
    }) || undefined
  );
  const [exchangeSelection, setExchangeSelection] = useState(
    (currentFeeding && currentFeeding.vars?.exchange && {
      entity: {
        id: currentFeeding.vars?.exchange?.id,
        label: currentFeeding.vars?.exchange?.label,
      },
      fillAmount: currentFeeding.vars?.amount || 0,
      fillPaymentTotal: (currentFeeding.vars?.payments?.toExchange || 0) + (currentFeeding.vars?.payments?.toPlayer || 0),
    }) || undefined
  );

  const originId = useMemo(() => {
    if (exchangeSelection) return exchangeSelection.entity;
    if (inventorySelection) return { id: inventorySelection.id, label: inventorySelection.label };
    return undefined;
  }, [exchangeSelection, inventorySelection]);
  const { data: origin } = useEntity(originId);
  const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  const { data: originLot } = useLot(originLotId);
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === inventorySelection?.slot), [origin, inventorySelection]);

  // handle "currentFeeding" state (or selectedItems for exchanges)
  useEffect(() => {
    if (currentFeeding) {
      console.log("current feeding:" + currentFeeding.vars?.food)
      setSelectedItems({ [Product.IDS.FOOD]: currentFeeding.vars?.food || 0 });
    }
  }, [currentFeeding]);

  const handleExchangeSelection = useCallback((selection) => {
    console.log("exchange selected:" + selection?.fillAmount)
    setExchangeSelection(selection);
    setSelectedItems(selection ? { [Product.IDS.FOOD]: selection?.fillAmount || 0 } : {});
  }, []);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!asteroid?.id || !originLot?.id) return [0, 0];
    const originLotIndex = Lot.toIndex(originLot?.id);
    const destinationLotIndex = crew?._location?.lotIndex;
    const transportDistance = Asteroid.getLotDistance(asteroid?.id, originLotIndex, destinationLotIndex);
    const effBonus = Math.max(crewTravelBonus.totalBonus, 1); // no penalty for food resupply
    const distBonus = Math.max(crewDistBonus.totalBonus, 1); // no penalty for food resupply
    const transportTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, destinationLotIndex, effBonus, distBonus),
      crew?._timeAcceleration
    );
    return [transportDistance, transportTime];
  }, [asteroid?.id, originLot?.id, crewTravelBonus, crewDistBonus, crew?._location?.lotIndex, crew?._timeAcceleration]);

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, resourceId) => {
      acc.totalMass += selectedItems[resourceId] * Product.TYPES[resourceId].massPerUnit;
      acc.totalVolume += selectedItems[resourceId] * Product.TYPES[resourceId].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [
      transportTime,
      0
    ];
  }, [transportTime]);

  const stats = useMemo(() => ([
    {
      label: 'Task Duration',
      value: formatTimer(transportTime),
      direction: getBonusDirection(crewTravelBonus) === -1 ? 0 : 1,
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus.totalBonus < 1 ? {} : crewTravelBonus}
          title="Transport Time"
          totalTime={transportTime}
          crewRequired="start" />
      )
    },
    {
      label: 'Transfer Distance',
      value: `${Math.round(transportDistance)} km`,
      direction: 0
    },
    {
      label: 'Transfered Mass',
      value: `${formatMass(totalMass)}`,
      direction: 0
    },
    {
      label: 'Transfered Volume',
      value: `${formatVolume(totalVolume)}`,
      direction: 0
    },
  ]), [totalMass, totalVolume, transportDistance, transportTime]);

  const onClear = useCallback(() => {
    setExchangeSelection();
    setInventorySelection();
    setSelectedItems({});
  }, []);

  const { data: exchangeOwnerCrew } = useCrew(exchangeSelection ? origin?.Control?.controller?.id : undefined);
  const { data: sellerCrew } = useCrew(exchangeSelection?.crew?.id);

  const onStartFeedingFromExchange = useCallback(() => {
    feedCrew({
      ...exchangeSelection,
      sellerAccount: sellerCrew?.Crew?.delegatedTo,
      exchangeOwnerAccount: exchangeOwnerCrew?.Crew?.delegatedTo,
    });
  }, [exchangeSelection, exchangeOwnerCrew, sellerCrew]);
  
  const onStartFeedingFromInventory = useCallback(() => {
    feedCrew({
      origin,
      originSlot: originInventory?.slot,
      amount: Math.floor(selectedItems[Product.IDS.FOOD])
    });
  }, [origin, originInventory, selectedItems]);

  const onStartFeeding = useCallback(() => {
    if (exchangeSelection) onStartFeedingFromExchange();
    else onStartFeedingFromInventory();
  }, [exchangeSelection, onStartFeedingFromExchange, onStartFeedingFromInventory]);

  const foodStats = useMemo(() => {
    const maxFood = (crew?._crewmates?.length || 1) * Crew.CREWMATE_FOOD_PER_YEAR;
    const timeSinceFed = Time.toGameDuration(blockTime - (crew?.Crew?.lastFed || 0), crew?._timeAcceleration);
    const currentFood = Math.floor(maxFood * Crew.getCurrentFoodRatio(timeSinceFed, crew._foodBonuses?.consumption)); // floor to quanta
    const addingFood = selectedItems[Product.IDS.FOOD] || 0;
    const postValue = (currentFood + addingFood) / maxFood;
    const postTimeSinceFed = Crew.getTimeSinceFed((currentFood + addingFood) / maxFood, crew._foodBonuses?.consumption);
    const rationingTimeSinceFed = Crew.getTimeSinceFed(0.5, crew._foodBonuses?.consumption);
    const OutOfFoodTimeSinceFed = Crew.getTimeSinceFed(0, crew._foodBonuses?.consumption);
    const rationingPenalty = 1 - Crew.getFoodMultiplier(postTimeSinceFed, crew._foodBonuses?.consumption, crew._foodBonuses?.rationing);
    const timeUntilRationing = Time.toRealDuration(Math.max(0, rationingTimeSinceFed - postTimeSinceFed));
    const timeUntilOutOfFood = Time.toRealDuration(Math.max(0, OutOfFoodTimeSinceFed - postTimeSinceFed));
    const barColor = postValue >= 0.5 ? theme.colors.green : theme.colors.warning;
    const deltaValue = addingFood / maxFood;
    const crewConsumptionRate = timeUntilRationing > 0 
      ? formatFixed(((crew?._crewmates?.length || 1) * (Crew.CREWMATE_FOOD_PER_YEAR / 1281) * crew._foodBonuses?.consumption), 2) //Regular consumption rate
      : formatFixed(((crew?._crewmates?.length || 1) * (Crew.CREWMATE_FOOD_PER_YEAR / 1281) * crew._foodBonuses?.consumption * 0.5), 2); //Rationing consumption rate
    const crewConsumptionBonus =  formatFixed((crew._foodBonuses?.consumption), 2);
    return {
      addingFood,
      barColor,
      currentFood,
      deltaValue,
      maxFood,
      postValue,
      rationingPenalty,
      timeUntilRationing,
      timeUntilOutOfFood,
      crewConsumptionRate,
      crewConsumptionBonus
    }
  }, [crew?._crewmates, crew?.Crew?.lastFed, crew?._timeAcceleration, blockTime, selectedItems]);

  const disabled = useMemo(() => {
    if (!origin) return true;
    if (totalMass === 0) return true;
    if (inventorySelection) return !crewCan(Permission.IDS.REMOVE_PRODUCTS, origin);
    if (exchangeSelection) return !crewCan(Permission.IDS.BUY, origin);
    return true;
  }, [origin, totalMass, crewCan]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <AddRationsIcon />,
          label: 'Resupply Food',
          status: stage === actionStages.NOT_STARTED ? 'Send Items' : undefined,
        }}
        actionCrew={crew}
        location={{ asteroid, lot: originLot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        overrideColor={stage === actionStages.NOT_STARTED ? theme.colors.main : undefined}
        stage={stage} />

      <ActionDialogBody>

        <ActionDialogTabs
          onSelect={setTab}
          selected={tab}
          tabs={[
            { icon: <RouteIcon />, label: 'Transfer' },
            inventorySelection ? { icon: <InventoryIcon />, iconStyle: { fontSize: 22 }, label: 'Inventory' } : undefined,
          ]} />

        <FlexSection>
          <MultiSourceInputBlock
            crew={crew}
            disabled={stage !== actionStages.NOT_STARTED}
            isSelected={stage === actionStages.NOT_STARTED && exchangeSelection || inventorySelection}
            exchangeSelection={exchangeSelection}
            inventorySelection={inventorySelection}
            onClear={onClear}
            onClickExchange={() => { setExchangeSelectorOpen(true) }}
            onClickInventory={() => { setInventorySelectorOpen(true) }}
            origin={origin}
            originLot={originLot}
            stage={stage}
            title="Origin"
            titleDetails={transportDistance !== undefined && (
              <TransferDistanceDetails distance={transportDistance} crewDistBonus={crewDistBonus} />
            )}
            transferMass={-totalMass}
            transferVolume={-totalVolume} />

          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <CrewInputBlock
            crew={crew}
            title="To Crew" />
        </FlexSection>
        {tab === 0 && (
          <>
            <FlexSection style={{ alignItems: 'flex-start' }}>
              <FlexSectionBlock
                title={`${exchangeSelection ? 'Purchase' : 'Transfer'} Food`}
                titleDetails={exchangeSelection && <><SwayIcon /> {((exchangeSelection.fillPaymentTotal || 0) / TOKEN_SCALE[TOKEN.SWAY]).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>}
                style={{ alignSelf: 'stretch', marginBottom: 56 }}
                bodyStyle={{ padding: 0 }}>
                <ItemSelectionSection
                  columns={3}
                  label="Transfer Food"
                  items={selectedItems}
                  minCells={0}
                  onClick={inventorySelection && stage === actionStages.NOT_STARTED && origin ? (() => setTransferSelectorOpen(true)) : undefined}
                  stage={stage}
                  style={{ height: '130px' }}
                  unwrapped />
              </FlexSectionBlock>

              <FlexSectionSpacer />

              <div style={{ alignSelf: 'flex-start', paddingTop: 10, width: '50%' }}>
                <FoodMiniBar {...foodStats} />
                <div style={{borderBottom: '1px solid #333', margin:'20px 0 12px'}} />
                <RationingPenalty
                  style={{ color: foodStats.rationingPenalty > 0 ? theme.colors.warning : theme.colors.green}} 
                  data-tooltip-id="actionDialogTooltip"
                  data-tooltip-place="left"
                  data-tooltip-html='
                  <div style="width: 350px">
                    <label style="font-size: 14px; text-transform: uppercase; font-weight: bold; display: flex; margin-top: 8px; margin-bottom: 12px">
                      Rationing Penalty
                    </label>
                    <div style="display: flex; border-bottom:1px solid rgba(255, 255, 255, 0.25)"></div>  
                    <div style="margin-top: 8px; margin-bottom: 8px">
                      Crews begin <span style="font-weight: bold">Rationing</span> when 50% of their food is depleted.<br></br>
                      Rationing Crews perform all actions with an efficiency penalty that begins at <span style="font-weight: bold">0%</span> and increases to <span style="font-weight: bold">75%</span> when they are completely out of food.
                    </div>
                  </div>
                  '>
                  {foodStats.rationingPenalty > 0 ? <WarningIcon /> : <FoodIcon />}
                  <label>Rationing Penalty</label>
                  <span>{formatFixed(100 * (foodStats.rationingPenalty || 0), 1)}%</span>
                </RationingPenalty>
                <TimeUntilRationing 
                  style={{ color: foodStats.timeUntilRationing > 0 ? theme.colors.brightMain : theme.colors.red}}
                  data-tooltip-id="actionDialogTooltip"
                  data-tooltip-place="left"
                  data-tooltip-html={`
                    <div style="width: 350px">
                      <label style="font-size: 14px; text-transform: uppercase; font-weight: bold; display: flex; margin-top: 8px; margin-bottom: 12px">
                        Food Consumption
                      </label>
                      <div style="display: flex; border-bottom:1px solid rgba(255, 255, 255, 0.25)"></div>  
                      <div style="align-items: center; display: flex; justify-content: space-between; margin-top: 8px; margin-bottom: 8px">
                        <label>${foodStats.timeUntilRationing > 0 ? 'Consumption Rate' : 'Rationing Consumption Rate'}</label>
                        <span>${foodStats.crewConsumptionRate} kg / hour</span>
                      </div>
                      <div style="align-items: center; display: flex; justify-content: space-between; margin-top: 8px; margin-bottom: 8px">
                        <label>Consumption Bonuses</label>
                        <span>x ${formatFixed((foodStats.crewConsumptionBonus || 0), 2)}</span>
                      </div>
                    </div>
                  `}>
                  <StopwatchIcon />
                  {foodStats.timeUntilRationing > 0 
                  ? <><label>Time Until Rationing</label>
                    <span>{formatTimer(foodStats.timeUntilRationing)}</span>
                    </>
                  : <><label>Time Until Out of Food</label>
                    <span>{formatTimer(foodStats.timeUntilOutOfFood)}</span>
                    </>
                  }
                </TimeUntilRationing>
              </div>

            </FlexSection>

            {stage !== actionStages.NOT_STARTED && (
              <ProgressBarSection
                stage={stage}
                title="Progress"
                totalTime={transportTime}
              />
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <FlexSection>
              <div style={{ width: '50%', overflow: 'hidden' }}>
                <InventoryChangeCharts
                  inventory={originInventory}
                  inventoryBonuses={crew?._inventoryBonuses}
                  deltaMass={-totalMass}
                  deltaVolume={-totalVolume}
                  stage={stage}
                />
              </div>
              <FlexSectionSpacer />
              <div style={{ alignSelf: 'flex-start', width: '50%', overflow: 'hidden' }}>
                <FoodMiniBar {...foodStats} />
              </div>
            </FlexSection>
          </>
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={disabled}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onGo={onStartFeeding}
        stage={stage}
        waitForCrewReady
        {...props} />

      {stage === actionStages.NOT_STARTED && (
        <>
          <TransferSelectionDialog
            sourceEntity={origin}
            sourceContents={originInventory?.contents || []}
            targetInventoryConstraints={{ [129]: Math.max(0, foodStats.maxFood - foodStats.currentFood) }}
            initialSelection={selectedItems}
            inventoryBonuses={crew?._inventoryBonuses}
            onClose={() => setTransferSelectorOpen(false)}
            onSelected={setSelectedItems}
            open={transferSelectorOpen}
            requirements={[{
              i: Product.IDS.FOOD,
              inNeed: Math.max(0, foodStats.maxFood - foodStats.currentFood)
            }]}
          />

          <OrderSelectionDialog
            asteroidId={asteroid?.id}
            isSourcing
            maxAmount={Math.max(0, foodStats.maxFood - foodStats.currentFood)}
            otherEntity={crew}
            onClose={() => setExchangeSelectorOpen(false)}
            onCompleted={handleExchangeSelection}
            open={exchangeSelectorOpen}
            productId={Product.IDS.FOOD}
            singleSelectionMode
          />

          <InventorySelectionDialog
            asteroidId={asteroid?.id}
            isSourcing
            itemIds={[Product.IDS.FOOD]}
            otherEntity={crew}
            onClose={() => setInventorySelectorOpen(false)}
            onSelected={setInventorySelection}
            open={inventorySelectorOpen}
            requirePresenceOfItemIds
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { crew, isLoading: crewIsLoading } = useCrewContext();

  const feedCrewManager = useFeedCrewManager();

  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(crew?._location?.asteroidId);

  const stage = feedCrewManager.actionStage || actionStages.NOT_STARTED;

  // handle auto-closing on any status change
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && stage !== lastStatus.current) {
      props.onClose();
    }
    if (!feedCrewManager.isLoading) {
      lastStatus.current = stage;
    }
  }, [feedCrewManager.isLoading, stage]);

  return (
    <ActionDialogInner
      actionImage="CrewManagement"
      isLoading={reactBool(crewIsLoading || asteroidIsLoading)}
      stage={stage}>
      <FeedCrew
        asteroid={asteroid}
        feedCrewManager={feedCrewManager}
        stage={feedCrewManager?.actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
