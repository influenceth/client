import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crew, Crewmate, Lot, Permission, Product, Time } from '@influenceth/sdk';
import styled from 'styled-components';

import { FoodIcon, ForwardIcon, InventoryIcon, LocationIcon, RouteIcon } from '~/components/Icons';
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
  InventoryInputBlock,
  CrewInputBlock,
  MiniBarChart,
  formatResourceMass,
} from './components';
import { ActionDialogInner } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import theme from '~/theme';
import useEntity from '~/hooks/useEntity';
import formatters from '~/lib/formatters';
import useFeedCrewManager from '~/hooks/actionManagers/useFeedCrewManager';
import useAsteroid from '~/hooks/useAsteroid';
import useBlockTime from '~/hooks/useBlockTime';

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
`;

const FoodMiniBar = ({ addingFood, barColor, deltaValue, maxFood, postValue }) => (
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
        <UnderLabel style={{ color: barColor }}>{deltaValue < 0 ? '-' : '+'}{formatResourceMass(addingFood, Product.IDS.FOOD)}</UnderLabel>
        <UnderLabel style={{ color: theme.colors.warning }}>50%</UnderLabel>
        <UnderLabel style={{ color: 'white' }}>{formatResourceMass(maxFood, Product.IDS.FOOD)}</UnderLabel>
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

  const crewmates = crew?._crewmates;
  const captain = crewmates[0];

  const crewTravelBonus = useMemo(() => {
    if (!crew) return {};
    return getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew) || {};
  }, [crew]);

  const [originSelectorOpen, setOriginSelectorOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [transferSelectorOpen, setTransferSelectorOpen] = useState();
  const [selectedItems, setSelectedItems] = useState(props.preselect?.selectedItems || {});

  // get origin* data
  const [originSelection, setOriginSelection] = useState(
    (currentFeeding && currentFeeding.vars?.origin && {
      id: currentFeeding.vars?.origin?.id,
      label: currentFeeding.vars?.origin?.label,
      slot: currentFeeding.vars?.origin_slot,
    }) || undefined
  );
  const { data: origin } = useEntity(originSelection ? { id: originSelection.id, label: originSelection.label } : undefined);
  const originLotId = useMemo(() => origin && locationsArrToObj(origin?.Location?.locations || []).lotId, [origin]);
  const { data: originLot } = useLot(originLotId);
  const originInventory = useMemo(() => (origin?.Inventories || []).find((i) => i.slot === originSelection?.slot), [origin, originSelection]);

  // handle "currentFeeding" state
  useEffect(() => {
    if (currentFeeding) {
      setSelectedItems({ [Product.IDS.FOOD]: currentFeeding.vars?.food || 0 });
    }
  }, [currentFeeding]);

  const [transportDistance, transportTime] = useMemo(() => {
    if (!asteroid?.id || !originLot?.id) return [0, 0];
    const originLotIndex = Lot.toIndex(originLot?.id);
    const destinationLotIndex = crew?._location?.lotIndex;
    const transportDistance = Asteroid.getLotDistance(asteroid?.id, originLotIndex, destinationLotIndex);
    const transportTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroid?.id, originLotIndex, destinationLotIndex, crewTravelBonus.totalBonus),
      crew?._timeAcceleration
    );
    return [transportDistance, transportTime];
  }, [asteroid?.id, originLot?.id, crewTravelBonus, crew?._location?.lotIndex, crew?._timeAcceleration]);

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
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
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

  const onStartFeeding = useCallback(() => {
    feedCrew({
      origin,
      originSlot: originInventory?.slot,
      amount: Math.floor(selectedItems[Product.IDS.FOOD])
    });
  }, [asteroid?.id, origin, originInventory, originLot, selectedItems]);

  const foodStats = useMemo(() => {
    const maxFood = (crew?._crewmates?.length || 1) * Crew.CREWMATE_FOOD_PER_YEAR;
    const timeSinceFed = Time.toGameDuration(blockTime - (crew?.Crew?.lastFed || 0), crew?._timeAcceleration);
    const currentFood = Math.floor(maxFood * Crew.getCurrentFoodRatio(timeSinceFed, crew._foodBonuses?.consumption)); // floor to quanta
    const addingFood = selectedItems[Product.IDS.FOOD] || 0;
    const postValue = (currentFood + addingFood) / maxFood;
    const postTimeSinceFed = Crew.getTimeSinceFed((currentFood + addingFood) / maxFood, crew._foodBonuses?.consumption);
    const rationingTimeSinceFed = Crew.getTimeSinceFed(0.5, crew._foodBonuses?.consumption);
    const rationingPenalty = 1 - Crew.getFoodMultiplier(postTimeSinceFed, crew._foodBonuses?.consumption, crew._foodBonuses?.rationing);
    const timeUntilRationing = Time.toRealDuration(Math.max(0, rationingTimeSinceFed - postTimeSinceFed));
  
    const barColor = postValue >= 0.5 ? theme.colors.green : theme.colors.warning;
    const deltaValue = addingFood / maxFood;

    return {
      addingFood,
      barColor,
      currentFood,
      deltaValue,
      maxFood,
      postValue,
      rationingPenalty,
      timeUntilRationing
    }
  }, [crew?._crewmates, crew?.Crew?.lastFed, crew?._timeAcceleration, blockTime, selectedItems]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <FoodIcon />,
          label: 'Resupply Food',
          status: stage === actionStages.NOT_STARTED ? 'Send Items' : undefined,
        }}
        captain={captain}
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
            { icon: <InventoryIcon />, iconStyle: { fontSize: 22 }, label: 'Inventory' },
          ]} />

        <FlexSection>
          <InventoryInputBlock
            title="Origin"
            titleDetails={<TransferDistanceDetails distance={transportDistance} />}
            disabled={stage !== actionStages.NOT_STARTED}
            entity={origin}
            inventorySlot={originSelection?.slot}
            inventoryBonuses={crew?._inventoryBonuses}
            imageProps={{
              iconOverride: <InventoryIcon />,
            }}
            isSelected={stage === actionStages.NOT_STARTED}
            isSourcing
            onClick={() => { setOriginSelectorOpen(true) }}
            sublabel={
              originLot
              ? <><LocationIcon /> {formatters.lotName(originSelection?.lotIndex)}</>
              : 'Inventory'
            }
            transferMass={totalMass}
            transferVolume={totalVolume} />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <CrewInputBlock
            crew={crew}
            title="To Crew"
            />
        </FlexSection>

        {tab === 0 && (
          <>
            <FlexSection style={{ alignItems: 'flex-start' }}>
              <FlexSectionBlock title="Transferred Food" style={{ alignSelf: 'stretch', marginBottom: 56 }} bodyStyle={{ height: '100%', padding: 0 }}>
                <ItemSelectionSection
                  columns={3}
                  label="Transfer Food"
                  items={selectedItems}
                  minCells={0}
                  onClick={stage === actionStages.NOT_STARTED && origin ? (() => setTransferSelectorOpen(true)) : undefined}
                  stage={stage}
                  style={{ height: '100%' }}
                  unwrapped />
              </FlexSectionBlock>

              <FlexSectionSpacer />

              <div style={{ alignSelf: 'flex-start', paddingTop: 10, width: '50%' }}>
                <FoodMiniBar {...foodStats} />

                <hr style={{ margin: '15px 0', opacity: 0.2 }} />

                <PseudoStatRow>
                  <label>Rationing Penalty</label>
                  <span style={{ color: foodStats.rationingPenalty > 0 ? theme.colors.red : theme.colors.green }}>{formatFixed(100 * (foodStats.rationingPenalty || 0), 1)}%</span>
                </PseudoStatRow>
                <PseudoStatRow>
                  <label>Time Until Rationing</label>
                  <span>{formatTimer(foodStats.timeUntilRationing)}</span>
                </PseudoStatRow>

                <WarningAlert severity="warning" style={{ marginBottom: 20 }}>
                  <div style={{ alignSelf: 'flex-start' }}><FoodIcon /></div>
                  <div>
                    A crew must start <i>Rationing</i> when 50% of their food is depleted.
                    <br/><br/>
                    Rationing Crews perform all actions with an efficiency penalty that
                    begins at <i>0%</i> and increases to <i>75%</i> when they are completely
                    out of food.
                  </div>
                </WarningAlert>
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
        disabled={!origin || totalMass === 0 || !crewCan(Permission.IDS.REMOVE_PRODUCTS, origin)}
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

          <InventorySelectionDialog
            asteroidId={asteroid?.id}
            isSourcing
            itemIds={[Product.IDS.FOOD]}
            otherEntity={crew}
            onClose={() => setOriginSelectorOpen(false)}
            onSelected={setOriginSelection}
            open={originSelectorOpen}
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
