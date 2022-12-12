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
  const { constructionStatus, deconstruct } = useConstructionManager(asteroid?.i, plot?.i);
  const resources = useResourceAssets();

  // TODO: hide sections and status for now... deconstruct only needs capable_id

  const destinationPlot = {
    i: 23441,
    building: buildings[1]
  };
  
  const stats = useMemo(() => [
    { label: 'Returned Volume', value: '4,200 m³', direction: 1 },
    { label: 'Returned Mass', value: '120,500 tonnes', direction: 1 },
    { label: 'Transfer Distance', value: '18 km', direction: 0 },
    { label: 'Crew Travel', value: '6m 00s', direction: 1 },
    { label: 'Deconstruction Time', value: '1h 10m 15s', direction: 0 },
    { label: 'Transport Time', value: '24m 30s', direction: 0 },
  ], []);

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
        buttonsLoading={constructionStatus === 'PLANNING'}
        goLabel="Deconstruct"
        onGo={deconstruct}
        status={constructionStatus === 'PLANNING' ? 'DURING' : 'BEFORE'} />
    </>
  );
};

export default Deconstruct;
