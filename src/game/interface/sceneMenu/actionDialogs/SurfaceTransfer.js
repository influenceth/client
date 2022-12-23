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

const Construct = (props) => {
  const { asteroid, onClose, plot } = props;
  const buildings = useBuildingAssets();
  const resources = useResourceAssets();
  const { constructionStatus, startConstruction, finishConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();
  
  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const constructionBonus = getCrewAbilityBonus(5, crewMembers);

  const crewTravelTime = Asteroid.getLotTravelTime(asteroid.i, 1, plot.i, crewTravelBonus.totalBonus);
  const constructionTime = Construction.getConstructionTime(plot.building.assetId, constructionBonus.totalBonus);

  const destinationPlot = {
    i: 23441,
    building: buildings[1]
  };

  const stats = [
    { label: 'Total Volume', value: '4,200 m³', direction: 1 },
    { label: 'Total Mass', value: '120,500 tonnes', direction: 1 },
    { label: 'Transfer Distance', value: '18 km', direction: 0 },
    { label: 'Crew Travel', value: '6m 00s', direction: 1 },
    { label: 'Transport Time', value: '24m 30s', direction: 0 },
  ];

  const status = useMemo(() => {
    if (constructionStatus === 'PLANNED') {
      return 'BEFORE';
    } else if (constructionStatus === 'UNDER_CONSTRUCTION') {
      return 'DURING';
    }
    return 'AFTER';
  }, [constructionStatus]);

  useEffect(() => {
    if (constructionStatus === 'FINISHING' || constructionStatus === 'OPERATIONAL') {
      onClose();
    }
  }, [constructionStatus]);

  return (
    <>
      <ActionDialogHeader
        {...props}
        action={{
          actionIcon: <SurfaceTransferIcon />,
          headerBackground: surfaceTransferBackground,
          label: 'Surface Transfer',
          completeLabel: 'Transfer',
          completeStatus: 'Complete',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={plot?.building?.startTime}
        targetTime={plot?.building?.committedTime} />

      <ItemSelectionSection items={ingredients} resources={resources} status={status} />
      <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime}
          actionReadyIn={crewTravelTime + constructionTime} />
      )}

      <ActionDialogFooter
        {...props}
        disabled={false}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onFinalize={finishConstruction}
        onGo={startConstruction}
        status={status} />
    </>
  );
};

export default Construct;