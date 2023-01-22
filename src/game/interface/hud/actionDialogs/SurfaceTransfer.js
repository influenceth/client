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
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
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

  getBonusDirection,
  getTripDetails,
  formatSampleMass,
  formatSampleVolume,
  TravelBonusTooltip,
  TimeBonusTooltip,
  ActionDialogLoader,
  formatMass,
  formatVolume,
} from './components';
import useDeliveryManager from '~/hooks/useDeliveryManager';
import usePlot from '~/hooks/usePlot';

const SurfaceTransfer = ({ asteroid, plot, ...props }) => {
  const resources = useResourceAssets();
  // NOTE: plot should be destination if deliveryId > 0
  const { currentDelivery, deliveryStatus, startDelivery, finishDelivery } = useDeliveryManager(asteroid?.i, plot?.i, props.deliveryId);
  const { crew, crewMemberMap } = useCrew();
  const { data: currentDeliveryOriginPlot } = usePlot(asteroid.i, currentDelivery?.originPlotId);
  const { data: currentDeliveryDestinationPlot } = usePlot(asteroid.i, currentDelivery?.destPlotId);

  const originPlot = useMemo(
    () => currentDelivery ? currentDeliveryOriginPlot : plot,
    [currentDelivery, currentDeliveryOriginPlot, plot]
  ) || {};
  const [destinationPlot, setDestinationPlot] = useState();
  const [selectedItems, setSelectedItems] = useState({});

  const crewMembers = currentDelivery?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  // handle "currentDelivery" state
  useEffect(() => {
    if (currentDelivery) {
      setSelectedItems(currentDelivery.resources);
    }
  }, [currentDelivery]);

  useEffect(() => {
    if (currentDeliveryDestinationPlot) {
      setDestinationPlot(currentDeliveryDestinationPlot);
    }
  }, [currentDeliveryDestinationPlot]);

  const transportDistance = Asteroid.getLotDistance(asteroid?.i, originPlot?.i, destinationPlot?.i) || 0;
  const transportTime = Asteroid.getLotTravelTime(asteroid?.i, originPlot?.i, destinationPlot?.i, crewTravelBonus.totalBonus) || 0;

  const { totalMass, totalVolume } = useMemo(() => {
    return Object.keys(selectedItems).reduce((acc, cur) => {
      acc.totalMass += selectedItems[cur] * resources[cur].massPerUnit;
      acc.totalVolume += selectedItems[cur] * resources[cur].volumePerUnit;
      return acc;
    }, { totalMass: 0, totalVolume: 0 })
  }, [selectedItems]);

  const stats = useMemo(() => ([
    {
      label: 'Total Mass',
      value: `${formatMass(totalMass * 1e6)}`,
      direction: 0
    },
    {
      label: 'Total Volume',
      value: `${formatVolume(totalVolume * 1e6)}`,
      direction: 0
    },
    {
      label: 'Transfer Distance',
      value: `${Math.round(transportDistance)} km`,
      direction: 0
    },
    {
      label: 'Transport Time',
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
  ]), [totalMass, totalVolume, transportDistance, transportTime]);

  const status = useMemo(() => {
    if (deliveryStatus === 'READY') {
      return 'BEFORE';
    } else if (deliveryStatus === 'IN_TRANSIT') {
      return 'DURING';
    }
    return 'AFTER';
  }, [deliveryStatus]);

  const originInvId = useMemo(() => {
    if (originPlot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (originPlot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [originPlot?.building?.construction?.status]);

  const destInvId = useMemo(() => {
    if (destinationPlot?.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      return 1;
    } else if (destinationPlot?.building?.construction?.status === Construction.STATUS_PLANNED) {
      return 0;
    }
    return null;
  }, [destinationPlot]);

  const originInventory = useMemo(() => {
    return (originPlot?.building?.inventories || {})[originInvId];
  }, [originInvId, originPlot?.building?.inventories]);

  useEffect(() => {
    if (deliveryStatus === 'DEPARTING' || deliveryStatus === 'FINISHING' || deliveryStatus === 'FINISHED') {
      props.onClose();
    }
  }, [deliveryStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={currentDeliveryOriginPlot || originPlot}
        action={{
          actionIcon: <SurfaceTransferIcon />,
          headerBackground: surfaceTransferBackground,
          label: 'Surface Transfer',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={currentDelivery?.startTime}
        targetTime={currentDelivery?.completionTime}
        {...props} />

      <ItemSelectionSection
        inventory={originInventory?.resources || {}}
        onSelectItems={setSelectedItems}
        resources={resources}
        selectedItems={selectedItems}
        status={status} />

      <DestinationPlotSection
        asteroid={asteroid}
        originPlot={originPlot}
        destinationPlot={destinationPlot}
        onDestinationSelect={setDestinationPlot}
        status={status} />

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers crewAvailableIn={0} actionReadyIn={transportTime} />
      )}

      <ActionDialogFooter
        {...props}
        finalizeLabel="Complete"
        goDisabled={!destinationPlot?.i || totalMass === 0}
        goLabel="Transfer"
        onFinalize={() => finishDelivery()}
        onGo={() => startDelivery({
          originInvId: originInvId,
          destPlotId: destinationPlot?.i,
          destInvId,
          resources: selectedItems
        })}
        status={status} />
    </>
  );
};

export default SurfaceTransfer;