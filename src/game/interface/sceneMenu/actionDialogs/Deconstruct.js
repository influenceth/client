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
import CrewCard from '~/components/CrewCard';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  CancelBlueprintIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
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
import { getAdjustedNow, getCrewAbilityBonus } from '~/lib/utils';

import {
  LiveTimer,
  BlueprintSelection,
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

  formatTimer,
  getBonusDirection,
} from './components';

const Deconstruct = (props) => {
  const { asteroid, plot } = props;
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { constructionStatus, deconstruct } = useConstructionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();

  const destinationPlot = {
    i: 1,
    building: buildings[1]
  };
  
  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const constructionBonus = getCrewAbilityBonus(5, crewMembers);
  const transportBonus = crewTravelBonus;

  const crewTravelTime = Asteroid.getLotTravelTime(asteroid.i, 1, plot.i, crewTravelBonus.totalBonus); // TODO: ...
  const lotDistance = Asteroid.getLotDistance(asteroid.i, plot.i, 1); // TODO: ...
  const constructionTime = Construction.getConstructionTime(plot.building.assetId, constructionBonus.totalBonus);
  const transportTime = Asteroid.getLotTravelTime(asteroid.i, plot.i, 1, crewTravelBonus.totalBonus); // TODO: ...

  const stats = useMemo(() => [
    { label: 'Returned Volume', value: '0 m³', direction: 0 },    // TODO: ...
    { label: 'Returned Mass', value: '0 tonnes', direction: 0 },   // TODO: ...
    {
      label: 'Transfer Distance',
      value: `${Math.ceil(lotDistance)} km`,
      direction: 0
    },
    { 
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus)
    },
    {
      label: 'Deconstruction Time',
      value: formatTimer(constructionTime),
      direction: getBonusDirection(constructionBonus)
    },
    {
      label: 'Transport Time',
      value: formatTimer(transportTime),
      direction: getBonusDirection(transportBonus)
    },
  ], []);

  useEffect(() => {
    if (constructionStatus === 'READY_TO_PLAN') {
      props.onClose();
    }
  }, [constructionStatus]);

  const status = 'BEFORE';

  return (
    <>
      <ActionDialogHeader
        {...props}
        action={{
          actionIcon: <DeconstructIcon />,
          headerBackground: constructionBackground,
          label: 'Deconstruct Building',
          completeLabel: 'Deconstruction',
          completeStatus: 'Complete',
          crewRequirement: 'start',
        }}
        status="BEFORE" />

      <DeconstructionMaterialsSection label="Recovered Materials" resources={resources} status={status} />
      {status !== 'AFTER' && <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />}

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
