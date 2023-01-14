import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { CoreSample, Crew, Asteroid, Extraction, Lot, Inventory } from '@influenceth/sdk';

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
import useExtractionManager from '~/hooks/useExtractionManager';
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
  formatSampleMass,
  formatSampleVolume,
  getTripDetails,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip,
  ActionDialogLoader,
} from './components';
import usePlot from '~/hooks/usePlot';

const ExtractionDialog = ({ asteroid, plot, ...props }) => {
  const resources = useResourceAssets();
  const { currentExtraction, extractionStatus, startExtraction, finishExtraction } = useExtractionManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();
  const { data: currentExtractionDestinationPlot } = usePlot(asteroid.i, currentExtraction?.destinationLotId);

  const [amount, setAmount] = useState(0);
  const [destinationPlot, setDestinationPlot] = useState();
  const [selectedCoreSample, setSelectedCoreSample] = useState();
  
  const crewMembers = currentExtraction?._crewmates || (crew?.crewMembers || []).map((i) => crewMemberMap[i]);
  const captain = crewMembers[0];
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);
  const extractionBonus = getCrewAbilityBonus(4, crewMembers);

  const usableSamples = useMemo(() => {
    return (plot?.coreSamples || []).filter((c) => c.remainingYield > 0 && c.status >= CoreSample.STATUS_FINISHED);
  }, [plot?.coreSamples]);

  const selectCoreSample = useCallback((sample) => {
    setSelectedCoreSample(sample);
    setAmount(sample.remainingYield);
  }, []);

  useEffect(() => {
    if (usableSamples.length === 1 && !selectedCoreSample && !currentExtraction) {
      selectCoreSample(usableSamples[0]);
    }
  }, [!selectedCoreSample, usableSamples]);

  // handle "currentExtraction" state
  useEffect(() => {
    if (currentExtraction) {
      if (plot?.coreSamples) {
        const currentSample = plot.coreSamples.find((c) => c.resourceId === currentExtraction.resourceId && c.sampleId === currentExtraction.sampleId);
        if (currentSample) {
          setSelectedCoreSample(currentSample);
          setAmount(currentExtraction.yield);
        }
      }
    }
  }, [currentExtraction, plot?.coreSamples]);

  useEffect(() => {
    if (currentExtractionDestinationPlot) {
      setDestinationPlot(currentExtractionDestinationPlot);
    }
  }, [currentExtractionDestinationPlot]);

  const resource = useMemo(() => {
    if (selectedCoreSample) return resources[selectedCoreSample.resourceId];
    return null;
  }, [selectedCoreSample]);
  
  const extractionTime = useMemo(() => {
    if (selectedCoreSample) {
      return Extraction.getExtractionTime(
        amount,
        selectedCoreSample?.remainingYield || 0,
        selectedCoreSample?.initialYield || 0,
        extractionBonus.totalBonus
      )
    }
    return 0;
  }, [amount, selectedCoreSample]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.i || !plot?.i) return {};
    return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
      { label: 'Travel to destination', plot: plot.i },
      { label: 'Return from destination', plot: 1 },
    ]);
  }, [asteroid?.i, plot?.i, crewTravelBonus]);

  const stats = useMemo(() => ([
    {
      label: 'Extraction Mass',
      value: `${formatSampleMass(amount * resource?.massPerUnit || 0)} tonnes`,
      direction: 0
    },
    {
      label: 'Extraction Volume',
      value: `${formatSampleVolume(amount * resource?.volumePerUnit || 0)} m³`,
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
      label: 'Extraction Time',
      value: formatTimer(extractionTime),
      direction: getBonusDirection(extractionBonus),
      tooltip: extractionBonus.totalBonus !== 1 && extractionTime > 0 && (
        <TimeBonusTooltip
          bonus={extractionBonus}
          title="Extraction Time"
          totalTime={extractionTime}
          crewRequired="start" />
      )
    },
  ]), [amount, extractionTime, resource]);

  const status = useMemo(() => {
    if (extractionStatus === 'READY') {
      return 'BEFORE';
    } else if (extractionStatus === 'EXTRACTING') {
      return 'DURING';
    }
    return 'AFTER';
  }, [extractionStatus]);

  const onStartExtraction = useCallback(() => {
    startExtraction(amount, selectedCoreSample, destinationPlot);
  }, [amount, selectedCoreSample, destinationPlot]);

  useEffect(() => {
    if (extractionStatus === 'FINISHING') {
      props.onClose();
    }
  }, [extractionStatus]);

  console.log();
  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <ExtractionIcon />,
          headerBackground: extractionBackground,
          label: 'Extract Resource',
          completeLabel: 'Extraction',
          completeStatus: 'Complete',
          crewRequirement: 'start',
        }}
        status={status}
        startTime={plot?.building?.extraction?.startTime}
        targetTime={plot?.building?.extraction?.completionTime}
        {...props} />

      <ExtractSampleSection
        amount={amount}
        plot={plot}
        resources={resources}
        onSelectSample={selectCoreSample}
        selectedSample={selectedCoreSample}
        status={status}
        usableSamples={usableSamples} />

      <DestinationPlotSection
        asteroid={asteroid}
        destinationPlot={destinationPlot}
        originPlot={plot}
        onDestinationSelect={setDestinationPlot}
        status={status} />

      {status === 'BEFORE' && (
        <ExtractionAmountSection
          amount={amount}
          extractionTime={extractionTime}
          min={0}
          max={selectedCoreSample?.remainingYield || 0}
          resource={resource}
          setAmount={setAmount} />
      )}

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime}
          actionReadyIn={crewTravelTime + extractionTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsLoading={extractionStatus === 'FINISHING' || undefined}
        goDisabled={!destinationPlot || !selectedCoreSample || amount === 0}
        finalizeLabel="Complete"
        goLabel="Begin Extraction"
        onFinalize={finishExtraction}
        onGo={onStartExtraction}
        status={status} />
    </>
  );
};

export default ExtractionDialog;