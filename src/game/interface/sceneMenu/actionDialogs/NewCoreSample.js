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
  formatSampleValue,
} from './components';

const NewCoreSample = (props) => {
  const { asteroid, onClose, onSetAction, plot } = props;
  const resources = useResourceAssets();
  const resourceMap = useStore(s => s.asteroids.showResourceMap);

  const { currentSamplingProcess, startSampling, finishSampling, samplingStatus } = useCoreSampleManager(asteroid?.i, plot?.i, resourceMap?.i);
  const { crew, crewMemberMap } = useCrew();

  const abundance = 0.5; // TODO: abundance (NOTE: should be from currentSamplingProcess resource if there is one)
  
  const crewMembers = crew.crewMembers.map((i) => crewMemberMap[i]);
  const sampleTimeBonus = getCrewAbilityBonus(1, crewMembers);
  const sampleQualityBonus = getCrewAbilityBonus(2, crewMembers);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  const crewTravelTime = Asteroid.getLotTravelTime(asteroid.i, 1, plot.i, crewTravelBonus.totalBonus);
  const sampleBounds = CoreSample.getSampleBounds(abundance, 0, sampleQualityBonus.totalBonus);
  const sampleTime = CoreSample.getSampleTime(sampleTimeBonus.totalBonus);

  const [newSampleId, setNewSampleId] = useState();
  useEffect(() => {
    if (currentSamplingProcess) {
      setNewSampleId(currentSamplingProcess?.id);
    }
  }, [currentSamplingProcess]);

  const coreYield = useMemo(() => {
    const sample = (plot?.coreSamples || []).find((c) => c.id === newSampleId);
    if (sample && Object.keys(sample).includes('yield')) {
      return sample.yield * resources[sample.resourceId].massPerUnit;
    }
    return undefined;
  }, [newSampleId, plot?.coreSamples]);
  
  const stats = [
    {
      label: 'Discovery Minimum',
      value: `${formatSampleValue(sampleBounds.lower)} tonnes`,
      direction: getBonusDirection(sampleQualityBonus)
    },
    {
      label: 'Discovery Maximum',
      value: `${formatSampleValue(sampleBounds.upper)} tonnes`,
      direction: getBonusDirection(sampleQualityBonus)
    },
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus)
    },
    {
      label: 'Sample Time',
      value: formatTimer(sampleTime),
      direction: getBonusDirection(sampleTimeBonus)
    },
  ];

  const status = useMemo(() => {
    if (coreYield !== undefined) {
      return 'AFTER';
    } else if (samplingStatus === 'READY') {
      return 'BEFORE';
    } else if (samplingStatus === 'SAMPLING') {
      return 'DURING';
    }
    return 'AFTER';
  }, [coreYield, newSampleId, samplingStatus]);

  return (
    <>
      <ActionDialogHeader
        {...props}
        action={{
          actionIcon: <CoreSampleIcon />,
          headerBackground: coreSampleBackground,
          label: 'Core Sample',
          completeLabel: 'Sample',
          completeStatus: coreYield === undefined ? 'Ready for Analysis' : 'Analyzed',
          crewRequirement: 'duration',
        }}
        status={status}
        startTime={currentSamplingProcess?.startTime}
        targetTime={currentSamplingProcess?.committedTime} />

      <RawMaterialSection
        abundance={abundance}
        resource={resources[currentSamplingProcess?.resourceId || resourceMap.i]}
        status={status}
        tonnage={status === 'AFTER' && coreYield !== undefined ? coreYield : undefined} />

      {status === 'BEFORE' && (
        <ToolSection resource={resources[175]} sourcePlot={plot} />
      )}

      <ActionDialogStats stats={stats} status={status} />

      {status === 'BEFORE' && (
        <ActionDialogTimers
          crewAvailableIn={2 * crewTravelTime}
          actionReadyIn={crewTravelTime + sampleTime} />
      )}

      <ActionDialogFooter
        {...props}
        buttonsOverride={coreYield !== undefined && [
          { label: 'Close', onClick: onClose },
          { label: 'Improve Sample', onClick: () => { onSetAction('IMPROVE_CORE_SAMPLE'); } },
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

export default NewCoreSample;