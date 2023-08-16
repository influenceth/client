import { useEffect, useMemo, useState } from 'react';
import { Asteroid, Building, Crew, Crewmate } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import {
  DeconstructIcon,
  InventoryIcon,
  ForwardIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useConstructionManager from '~/hooks/useConstructionManager';
import { boolAttr, formatFixed, formatTimer } from '~/lib/utils';

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
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  DestinationSelectionDialog,
  EmptyBuildingImage,
  getBuildingRequirements,
  LotInputBlock
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useLot from '~/hooks/useLot';

const Deconstruct = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const { crew, crewmateMap } = useCrewContext();
  const { deconstruct, deconstructTx } = constructionManager;
  const { data: inProgressDestination } = useLot(asteroid?.i, deconstructTx?.returnValues?.destinationLotId);

  const crewmates = crew._crewmates.map((i) => crewmateMap[i]);
  const captain = crewmates[0];
  const crewTravelBonus = Crew.getAbilityBonus(Crewmate.ABILITY_IDS.SURFACE_TRANSPORT_SPEED, crewmates);

  const [destinationLot, setDestinationLot] = useState();
  const [destinationSelectorOpen, setDestinationSelectorOpen] = useState(false);

  useEffect(() => {
    if (inProgressDestination) setDestinationLot(inProgressDestination);
  }, [inProgressDestination]);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !lot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [
  //     { label: 'Travel to destination', lot: lot.i },
  //     { label: 'Return from destination', lot: 1 },
  //   ])
  // }, [asteroid?.i, lot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const constructionTime = Building.getConstructionTime(lot?.building?.Building?.buildingType || 0, 1);

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
      label: 'Deconstruction Time',
      value: formatTimer(constructionTime),
      direction: 0,
      isTimeStat: true,
    },
    {
      label: 'Transfer Distance',
      value: `${formatFixed(lot.i === destinationLot?.i ? 0 : (Asteroid.getLotDistance(asteroid.i, lot.i, destinationLot?.i) || 0), 1)} km`,
      direction: 0,
    }
  ], [destinationLot]);

  const itemsReturned = getBuildingRequirements(lot?.building);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <DeconstructIcon />,
          label: 'Deconstruct Building',
          status: stage === actionStage.NOT_STARTED ? 'Confirm' : '',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTravelTime}
        taskCompleteTime={crewTravelTime + constructionTime}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <LotInputBlock
            title="Deconstruct"
            lot={lot}
            disabled
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <LotInputBlock
            title="Transfer To"
            lot={destinationLot}
            fallbackSublabel="Inventory"
            imageProps={destinationLot && destinationLot.i === lot.i
              ? {
                unfinished: true
              }
              : {
                iconOverride: <InventoryIcon />,
                inventories: destinationLot?.building?.inventories,
                showInventoryStatusForType: 1
              }
            }
            isSelected={stage === actionStage.NOT_STARTED}
            onClick={() => { setDestinationSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
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
        disabled={!destinationLot}
        goLabel="Deconstruct"
        onGo={deconstruct}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <DestinationSelectionDialog
          asteroid={asteroid}
          originLotId={lot?.i}
          includeDeconstruction
          initialSelection={undefined/* TODO: default to self... */}
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
  const constructionManager = useConstructionManager(asteroid?.i, lot?.i);
  const { stageByActivity } = constructionManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  // stay in this window until PLANNED, then swap to UNPLAN / SURFACE_TRANSFER
  useEffect(() => {
    if (!['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionManager.constructionStatus)) {
      // TODO: if materials are recovered, open surface transport dialog w/ all materials selected
      // else, open "unplan" dialog
      props.onSetAction('UNPLAN_BUILDING');
    }
  }, [constructionManager.constructionStatus]);

  return (
    <ActionDialogInner
      actionImage={constructionBackground}
      isLoading={boolAttr(isLoading)}
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
