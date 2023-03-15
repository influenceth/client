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
  WarningOutlineIcon
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

  getBonusDirection,
  TravelBonusTooltip,
  getTravelStep,
  getTripDetails,
  TransportBonusTooltip,
  TimeBonusTooltip,
  ActionDialogLoader,
} from './components';

const Deconstruct = ({ asteroid, plot, ...props }) => {
  const resources = useResourceAssets();
  const { constructionStatus, deconstruct } = useConstructionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrewContext();

  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

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

  const constructionTime = Construction.getConstructionTime(plot?.building?.capableType || 0, 1);

  const stats = useMemo(() => [
    { label: 'Returned Volume', value: '0 m³', direction: 0 },    // TODO: ...
    { label: 'Returned Mass', value: '0 tonnes', direction: 0 },   // TODO: ...
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
    }
  ], []);

  // stay in this window until PLANNED, then swap to UNPLAN / SURFACE_TRANSFER
  useEffect(() => {
    if (!['OPERATIONAL', 'DECONSTRUCTING'].includes(constructionStatus)) {
      // TODO: if materials are recovered, open surface transport dialog w/ all materials selected
      // else, open "unplan" dialog
      props.onSetAction('UNPLAN_BUILDING');
    }
  }, [constructionStatus]);

  const status = 'BEFORE';

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <DeconstructIcon />,
          headerBackground: constructionBackground,
          label: 'Deconstruct Building',
          completeLabel: 'Deconstruction',
          crewRequirement: 'start',
        }}
        status="BEFORE"
        {...props} />

      <DeconstructionMaterialsSection label="Recovered Materials" resources={resources} status={status} />

      <ActionDialogStats stats={stats} status="BEFORE" />
      <ActionDialogTimers crewAvailableIn={0} actionReadyIn={0} />
      <ActionDialogFooter
        {...props}
        buttonsLoading={constructionStatus === 'DECONSTRUCTING'}
        goLabel="Deconstruct"
        onGo={deconstruct}
        status={constructionStatus === 'DECONSTRUCTING' ? 'DURING' : 'BEFORE'} />
    </>
  );
};

export default Deconstruct;