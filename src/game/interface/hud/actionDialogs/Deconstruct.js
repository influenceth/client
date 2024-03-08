import { useEffect, useMemo } from 'react';
import { Building, Crewmate, Inventory, Lot, Time } from '@influenceth/sdk';

import {
  DeconstructIcon,
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';
import { reactBool, formatTimer, getCrewAbilityBonuses } from '~/lib/utils';

import {
  DeconstructionMaterialsSection,
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  getBonusDirection,
  TravelBonusTooltip,
  ActionDialogBody,
  ProgressBarSection,
  FlexSection,
  getBuildingRequirements,
  LotInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import { getTripDetails } from './components';

const Deconstruct = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const { crew } = useCrewContext();
  const { deconstruct } = constructionManager;

  const captain = crew?._crewmates?.[0];

  const crewTravelBonus = useMemo(() => getCrewAbilityBonuses(Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, crew), [crew]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    return [crewTravelTime, 0];
  }, [crewTravelTime]);

  const stats = useMemo(() => [
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      tooltip: (
        <TravelBonusTooltip
          bonus={crewTravelBonus}
          totalTime={crewTravelTime}
          tripDetails={tripDetails}
          crewRequired="start" />
      )
    },
    {
      label: 'Deconstruction Penalty',
      value: `${Math.round(100 * Building.DECONSTRUCTION_PENALTY)}%`,
      direction: -1
      // TODO: add a tooltip here showing reduction by each item
    },
  ], [tripDetails]);

  const itemsReturned = useMemo(() => {
    if (!lot?.building) return [];
    return getBuildingRequirements(lot?.building).map((item) => ({
      ...item,
      totalRequired: (1 - Building.DECONSTRUCTION_PENALTY || 0) * item.totalRequired
    }));
  }, [lot?.building]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <DeconstructIcon />,
          label: 'Deconstruct Building',
          status: stage === actionStage.NOT_STARTED ? 'Confirm' : '',
        }}
        actionCrew={crew}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <LotInputBlock
            title="Deconstruct"
            lot={lot}
            disabled
          />
        </FlexSection>

        <DeconstructionMaterialsSection
          label="Recovered Materials"
          itemsReturned={itemsReturned || []} />

        {/* TODO: progress bar if this takes time */}
        {stage !== actionStage.NOT_STARTED && (
          <ProgressBarSection
            stage={stage}
            title="Progress"
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />
      </ActionDialogBody>

      <ActionDialogFooter
        goLabel="Deconstruct"
        onGo={deconstruct}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};


const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const constructionManager = useConstructionManager(lot?.id);
  const { stageByActivity } = constructionManager;

  useEffect(() => {
    if (!asteroid || !lot?.building) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // stay in this window until PLANNED (and lot updated), then swap to UNPLAN / SURFACE_TRANSFER
  useEffect(() => {
    if (!['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionManager.constructionStatus)) {
      const siteInventory = (lot?.building?.Inventories || []).find((i) => Inventory.TYPES[i.inventoryType].category === Inventory.CATEGORIES.SITE);
      if (siteInventory?.status === Inventory.STATUSES.AVAILABLE) {
        if (siteInventory?.mass > 0) { // (if materials recovered)
          props.onSetAction('SURFACE_TRANSFER');
        } else {
          props.onSetAction('UNPLAN_BUILDING');
        }
      }
    }
  }, [constructionManager.constructionStatus, lot?.building?.Inventories]);

  return (
    <ActionDialogInner
      actionImage="Construction"
      isLoading={reactBool(isLoading)}
      stage={stageByActivity.deconstruct}>
      <Deconstruct
        asteroid={asteroid}
        lot={lot}
        constructionManager={constructionManager}
        stage={stageByActivity.deconstruct}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
