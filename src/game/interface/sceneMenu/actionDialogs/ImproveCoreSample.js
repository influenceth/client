import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, CoreSample, Inventory, Lot } from '@influenceth/sdk';

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
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
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
  formatSampleMass,
  getTripDetails,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip,
} from './components';

const ImproveCoreSample = (props) => {
  const { asteroid, onClose, plot } = props;
  const resources = useResourceAssets();
  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const resourceMap = useStore(s => s.asteroids.showResourceMap);

  const { currentSample, startSampling, finishSampling, getTonnage, selectSampleToImprove, samplingStatus, lotStatus } = useCoreSampleManager(asteroid?.i, plot?.i, resourceMap?.i, true);
  const { crew, crewMemberMap } = useCrew();

  const abundance = 0.5; // TODO: abundance (NOTE: should be from currentSample resource if there is one)

  const improvableSamples = useMemo(() =>
    (plot?.coreSamples || [])
      .filter((c) => c.yield && c.status !== CoreSample.STATUS_USED)
      .map((c) => ({ ...c, tonnage: c.yield * resources[c.resourceId].massPerUnit }))
  , [plot?.coreSamples]);

  const originalYield = useMemo(() => currentSample?.yield, [currentSample?.id]); // only update on id change
  const originalTonnage = useMemo(() => originalYield ? originalYield * resources[currentSample.resourceId].massPerUnit : 0, [currentSample, originalYield]);
  const isImproved = useMemo(() => originalYield ? (currentSample?.status === CoreSample.STATUS_FINISHED && currentSample.yield > originalYield) : false, [currentSample, originalYield]);

  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const sampleTimeBonus = getCrewAbilityBonus(1, crewMembers);
  const sampleQualityBonus = getCrewAbilityBonus(2, crewMembers);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(
    () => getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
      { label: 'Retrieve Core Sampler', plot: 1 },  // TODO
      { label: 'Travel to destination', plot: plot.i },
      { label: 'Return from destination', plot: 1 },
    ]),
    [asteroid.i, crewTravelBonus, plot.i]
  );

  const sampleBounds = CoreSample.getSampleBounds(abundance, originalTonnage, sampleQualityBonus.totalBonus);
  const sampleTime = CoreSample.getSampleTime(sampleTimeBonus.totalBonus);

  const onReset = useCallback(() => {
    const repeatSample = { ...currentSample };
    selectSampleToImprove();
    setTimeout(() => {
      selectSampleToImprove(repeatSample);
    }, 0);
  }, [currentSample]);

  const onSampleSelection = useCallback((sample) => {
    if (sample.resourceId !== resourceMap?.i) {
      dispatchResourceMap(resources[sample.resourceId]);
    }
    selectSampleToImprove(sample);
  }, [resourceMap?.i]);
  
  const stats = [
    {
      label: 'Discovery Minimum',
      value: `${formatSampleMass(sampleBounds.lower)} tonnes`,
      direction: getBonusDirection(sampleQualityBonus),
      tooltip: sampleQualityBonus.totalBonus !== 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Minimum Yield"
          titleValue={`${formatSampleMass(sampleBounds.lower)} tonnes`} />
      )
    },
    {
      label: 'Discovery Maximum',
      value: `${formatSampleMass(sampleBounds.upper)} tonnes`,
      direction: getBonusDirection(sampleQualityBonus),
      tooltip: sampleQualityBonus.totalBonus !== 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Maximum Yield"
          titleValue={`${formatSampleMass(sampleBounds.upper)} tonnes`} />
      )
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
          crewRequired="duration" />
      )
    },
    {
      label: 'Sample Time',
      value: formatTimer(sampleTime),
      direction: getBonusDirection(sampleTimeBonus),
      tooltip: sampleTimeBonus.totalBonus !== 1 && (
        <TimeBonusTooltip
          bonus={sampleTimeBonus}
          title="Sample Time"
          totalTime={sampleTime}
          crewRequired="duration" />
      )
    },
  ];

  const status = useMemo(() => {
    if (isImproved) {
      return 'AFTER';
    } else if (samplingStatus === 'READY') {
      return 'BEFORE';
    } else if (samplingStatus === 'SAMPLING') {
      return 'DURING';
    }
    return 'AFTER';
  }, [isImproved, samplingStatus]);

  return (
    <>
      <ActionDialogHeader
        {...props}
        action={{
          actionIcon: <ImproveCoreSampleIcon />,
          headerBackground: coreSampleBackground,
          label: 'Improve Core Sample',
          completeLabel: 'Sample',
          completeStatus: !isImproved ? 'Ready for Analysis' : 'Analyzed',
          crewRequirement: 'duration',
        }}
        status={status}
        startTime={currentSample?.status === CoreSample.STATUS_FINISHED ? undefined : currentSample?.startTime}
        targetTime={currentSample?.status === CoreSample.STATUS_FINISHED ? undefined : currentSample?.committedTime} />

      <ExistingSampleSection
        plot={plot}
        improvableSamples={improvableSamples}
        onSelectSample={onSampleSelection}
        selectedSample={currentSample}
        resource={resources[resourceMap.i]}
        resources={resources}
        status={status}
        overrideTonnage={status === 'AFTER' ? getTonnage(currentSample) : undefined} />

      {status === 'BEFORE' && (
        <ToolSection resource={resources[175]} sourcePlot={plot} />
      )}

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={crewTravelTime + sampleTime}
          actionReadyIn={crewTravelTime + sampleTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsOverride={isImproved && [
          { label: 'Close', onClick: onClose },
          { label: 'Improve Again', onClick: onReset },
        ]}
        buttonsDisabled={samplingStatus === 'READY' && abundance === 0}
        buttonsLoading={samplingStatus === 'FINISHING' || undefined}
        finalizeLabel="Analyze"
        goLabel="Begin Sample"
        onFinalize={finishSampling}
        onGo={startSampling}
        status={samplingStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default ImproveCoreSample;