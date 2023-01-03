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
  getTripDetails,
  formatSampleMass,
  formatSampleVolume,
  TravelBonusTooltip,
  TimeBonusTooltip,
} from './components';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import usePlot from '~/hooks/usePlot';

const SurfaceTransfer = (props) => {
  const { asteroid, onClose, plot } = props;
  const resources = useResourceAssets();
  
  const { crew, crewMemberMap } = useCrew();
  
  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  const { data: destinationPlot } = usePlot(asteroid.i, 1951);
  // TODO: 1's probably should not be hard-coded
  const { deliveryStatus, startDelivery, finishDelivery } = useDeliveryManager(asteroid?.i, plot?.i, 1, destinationPlot?.i, 1);

  // TODO: select resource(s)
  //  aggregate into stat totals
  // resource?.massPerUnit, resource?.volumePerUnit

  const { totalTime: crewTravelTime, tripDetails } = useMemo(
    () => getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
      { label: 'Travel to Origin', plot: plot?.i, skipTo: destinationPlot?.i },
      { label: 'Return from Destination', plot: 1 },
    ]),
    [asteroid.i, crewTravelBonus, plot.i]
  );

  const transportDistance = Asteroid.getLotTravelTime(asteroid?.i, plot?.i, destinationPlot?.i);
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, plot?.i, destinationPlot?.i, crewTravelBonus) || 0;

  const stats = useMemo(() => ([
    {
      label: 'Total Volume',
      value: `${formatSampleMass(0 || 0)} tonnes`, // TODO
      direction: 0
    },
    {
      label: 'Total Mass',
      value: `${formatSampleVolume(0 || 0)} m³`,  // TODO
      direction: 0
    },
    {
      label: 'Transfer Distance',
      value: `${Math.round(transportDistance)} km`,
      direction: 0
    },
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
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
      label: 'Transport Time',
      value: formatTimer(transportTime),
      direction: getBonusDirection(crewTravelBonus),
      tooltip: (
        <TimeBonusTooltip
          bonus={crewTravelBonus}
          title="Transport Time"
          totalTime={transportTime}
          crewRequired="start" />
      )
    },
  ]), [resources, transportTime]);

  const status = useMemo(() => {
    if (deliveryStatus === 'READY') {
      return 'BEFORE';
    } else if (deliveryStatus === 'IN_TRANSIT') {
      return 'DURING';
    }
    return 'AFTER';
  }, [deliveryStatus]);

  useEffect(() => {
    if (deliveryStatus === 'FINISHING') {
      // TODO: link to new lot?
      onClose();
    }
  }, [deliveryStatus]);

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

      <ItemSelectionSection items={[]} resources={resources} status={status} />
      <DestinationPlotSection asteroid={asteroid} destinationPlot={destinationPlot} status={status} />

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime + transportTime}
          actionReadyIn={crewTravelTime + transportTime} />
      )}

      <ActionDialogFooter
        {...props}
        disabled={false}
        finalizeLabel="Complete"
        goLabel="Transfer"
        onFinalize={finishDelivery}
        onGo={startDelivery}
        status={status} />
    </>
  );
};

export default SurfaceTransfer;