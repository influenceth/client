import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, Lot } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  UnplanBuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  LocationIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon,
  InventoryIcon,
  ForwardIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { formatFixed, formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  CoreSampleSelection,
  DestinationSelection,

  BuildingPlanSection,
  BuildingRequirementsSection,
  DeconstructionMaterialsSection,
  DestinationLotSection,
  ExistingSampleSection,
  ExtractionAmountSection,
  ExtractSampleSection,
  ItemSelectionSection,
  RawMaterialSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  TravelBonusTooltip,
  getTravelStep,
  getTripDetails,
  TransportBonusTooltip,
  TimeBonusTooltip,
  ActionDialogLoader,
  ActionDialogBody,
  ProgressBarSection,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  BuildingImage,
  DestinationSelectionDialog,
  EmptyBuildingImage,
  getBuildingRequirements,
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStage from '~/lib/actionStages';
import useLot from '~/hooks/useLot';

const Deconstruct = ({ asteroid, lot, constructionManager, stage, ...props }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { crew, crewMemberMap } = useCrewContext();
  const { deconstruct, deconstructTx } = constructionManager;
  const { data: inProgressDestination } = useLot(asteroid?.i, deconstructTx?.returnValues?.destinationLotId);

  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

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

  const constructionTime = Construction.getConstructionTime(lot?.building?.capableType || 0, 1);

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
        crewAvailableTime={crewTravelTime}
        taskCompleteTime={crewTravelTime + constructionTime}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <FlexSectionInputBlock
            title="Deconstruct"
            image={<BuildingImage building={buildings[lot.building?.capableType || 0]} />}
            label={buildings[lot?.building?.capableType || 0].name}
            disabled
            sublabel="Building"
          />
          
          <FlexSectionSpacer>
            <ForwardIcon />
          </FlexSectionSpacer>

          <FlexSectionInputBlock
            title="Transfer To"
            image={
              destinationLot
                ? (
                  destinationLot.i === lot.i
                    ? (
                      <BuildingImage
                        building={buildings[destinationLot.building?.capableType || 0]}
                        unfinished />
                    )
                    : (
                      <BuildingImage
                        building={buildings[destinationLot.building?.capableType || 0]}
                        inventories={destinationLot?.building?.inventories}
                        showInventoryStatusForType={1} />
                    )
                )
                : <EmptyBuildingImage iconOverride={<InventoryIcon />} />
            }
            isSelected={stage === actionStage.NOT_STARTED}
            label={destinationLot ? buildings[destinationLot.building?.capableType || 0]?.name : 'Select'}
            onClick={() => { setDestinationSelectorOpen(true) }}
            disabled={stage !== actionStage.NOT_STARTED}
            sublabel={destinationLot ? <><LocationIcon /> Lot {destinationLot.i.toLocaleString()}</> : 'Inventory'}
          />
        </FlexSection>

        <DeconstructionMaterialsSection
          label="Recovered Materials"
          itemsReturned={itemsReturned || []}
          resources={resources} />

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
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
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
