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
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  LocationPinIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  CoreSampleSelection,
  DestinationSelection,

  BuildingPlanSection,
  BuildingRequirementsSection,
  DeconstructionMaterialsSection,
  DestinationPlotSection,
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

  ConstructionBonusTooltip,
  TravelBonusTooltip,

  getBonusDirection,
  getTripDetails,
  TimeBonusTooltip,
  ActionDialogLoader,
} from './components';

const Construct = ({ asteroid, plot, ...props }) => {
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { currentConstruction, constructionStatus, startConstruction, finishConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();

  const crewMembers = currentConstruction?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const constructionBonus = getCrewAbilityBonus(5, crewMembers);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !plot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [
  //     { label: 'Travel to destination', plot: plot.i },
  //     { label: 'Return from destination', plot: 1 },
  //   ])
  // }, [asteroid?.i, plot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const constructionTime = useMemo(() =>
    plot?.building?.capableType ? Construction.getConstructionTime(plot?.building?.capableType, constructionBonus.totalBonus) : 0,
    [plot?.building?.capableType, constructionBonus.totalBonus]
  );

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      isTimeStat: true,
      direction: getBonusDirection(crewTravelBonus),
      tooltip: (
        <TravelBonusTooltip
          bonus={crewTravelBonus}
          totalTime={crewTravelTime}
          tripDetails={tripDetails}
          crewRequired="start" />
      )
    },
    {
      label: 'Construction Time',
      value: formatTimer(constructionTime),
      isTimeStat: true,
      direction: getBonusDirection(constructionBonus),
      tooltip: constructionBonus.totalBonus !== 1 && (
        <TimeBonusTooltip
          bonus={constructionBonus}
          title="Construction Time"
          totalTime={constructionTime}
          crewRequired="start" />
      )
    },
  ]), [constructionBonus, constructionTime, crewTravelTime, crewTravelBonus, tripDetails]);

  const status = useMemo(() => {
    if (constructionStatus === 'PLANNED') {
      return 'BEFORE';
    } else if (constructionStatus === 'UNDER_CONSTRUCTION') {
      return 'DURING';
    }
    return 'AFTER';
  }, [constructionStatus]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (always close on)
    if (['OPERATIONAL'].includes(constructionStatus)) {
      props.onClose();
    }
    // (close on status change from)
    else if (['PLANNED', 'READY_TO_FINISH'].includes(lastStatus.current)) {
      if (constructionStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = constructionStatus;
  }, [constructionStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <ConstructIcon />,
          headerBackground: constructionBackground,
          label: 'Construct Building',
          completeLabel: 'Construction',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={plot?.building?.construction?.startTime}
        targetTime={plot?.building?.construction?.completionTime}
        {...props} />

      <BuildingPlanSection
        building={buildings[plot?.building?.capableType]}
        status={status}
        gracePeriodEnd={plot?.gracePeriodEnd} />

      {status === 'BEFORE' && (
        <BuildingRequirementsSection
          isGathering
          building={buildings[plot.building?.capableType]}
          label="Construction Materials"
          resources={resources} />
      )}

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime}
          actionReadyIn={crewTravelTime + constructionTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsLoading={constructionStatus === 'FINISHING' || undefined}
        disabled={false}
        finalizeLabel="Complete"
        goLabel="Construct Building"
        onFinalize={finishConstruction}
        onGo={startConstruction}
        status={constructionStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default Construct;