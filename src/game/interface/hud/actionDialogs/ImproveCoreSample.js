import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Asteroid as AsteroidLib, CoreSample, Inventory } from '@influenceth/sdk';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import { ImproveCoreSampleIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ExistingSampleSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  formatSampleMass,
  getTripDetails,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip
} from './components';

const ImproveCoreSample = ({ asteroid, plot, ...props }) => {
  const resources = useResourceAssets();
  const { startSampling, finishSampling, samplingStatus, ...coreSampleManager } = useCoreSampleManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();

  const dispatchResourceMap = useStore(s => s.dispatchResourceMap);
  const resourceId = useStore(s => s.asteroids.mapResourceId);

  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState();
  useEffect(() => {
    if (coreSampleManager.currentSample) {
      setSampleId(coreSampleManager.currentSample.sampleId);
      if (coreSampleManager.currentSample.resourceId !== resourceId) {
        dispatchResourceMap(coreSampleManager.currentSample.resourceId);
      }
    }
  }, [coreSampleManager.currentSample]);

  const sample = useMemo(() => {
    if (plot?.coreSamples) {
      if (resourceId && sampleId) {
        const thisSample = plot.coreSamples.find((s) => s.sampleId === sampleId && s.resourceId === resourceId);
        if (thisSample) {
          thisSample.initialYieldTonnage = Object.keys(thisSample).includes('initialYield')
            ? thisSample.initialYield * Inventory.RESOURCES[resourceId].massPerUnit
            : undefined;
          return thisSample;
        }
      }
    }
    return null;
  }, [plot.coreSamples, sampleId, resourceId]);

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.resourceSeed || !asteroid.resources) return 0;
    return AsteroidLib.getAbundanceAtLot(
      asteroid?.i,
      BigInt(asteroid?.resourceSeed),
      Number(plot?.i),
      resourceId,
      asteroid.resources[resourceId]
    );
}, [asteroid, plot, resourceId]);

  // handle sample selection
  const [selectedSample, setSelectedSample] = useState();

  const improvableSamples = useMemo(() =>
    (plot?.coreSamples || [])
      .filter((c) => c.initialYield && c.status !== CoreSample.STATUS_USED)
      .map((c) => ({ ...c, tonnage: c.initialYield * resources[c.resourceId].massPerUnit }))
  , [plot?.coreSamples]);

  const onReset = useCallback(() => {
    const repeatSample = { ...sample };
    props.onSetAction();
    setTimeout(() => {
      props.onSetAction('IMPROVE_CORE_SAMPLE', { preselect: { ...repeatSample } })
    }, 0);
  }, [sample]);

  const onSampleSelection = useCallback((sample) => {
    if (sample.resourceId !== resourceId) {
      dispatchResourceMap(sample.resourceId);
    }
    setSelectedSample(sample);
  }, [resourceId]);

  useEffect(() => {
    let defaultSelection;
    if (props.preselect) {
      defaultSelection = improvableSamples.find((s) => s.resourceId === props.preselect.resourceId && s.sampleId === props.preselect.sampleId);
    } else if (improvableSamples.length === 1) {
      defaultSelection = improvableSamples[0];
    }
    if (defaultSelection) {
      onSampleSelection(defaultSelection);
    }
  }, [improvableSamples, props.preselect]);

  const currentSample = sample || selectedSample;
  const originalYield = useMemo(() => currentSample?.initialYield, [currentSample?.resourceId, currentSample?.sampleId]); // only update on id change
  const originalTonnage = useMemo(() => originalYield ? originalYield * resources[currentSample.resourceId].massPerUnit : 0, [currentSample, originalYield]);
  const isImproved = useMemo(() => originalYield ? (currentSample?.status === CoreSample.STATUS_FINISHED && currentSample.initialYield > originalYield) : false, [currentSample, originalYield]);

  const crewMembers = coreSampleManager.currentSample?._crewmates
    || ((crew?.crewMembers || []).map((i) => crewMemberMap[i]));
  const captain = crewMembers[0];
  const sampleTimeBonus = getCrewAbilityBonus(1, crewMembers);
  const sampleQualityBonus = getCrewAbilityBonus(2, crewMembers);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.i || !plot?.i) return {};
    return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
      { label: 'Retrieve Core Sampler', plot: 1 },  // TODO
      { label: 'Travel to destination', plot: plot.i },
      { label: 'Return from destination', plot: 1 },
    ]);
  }, [asteroid?.i, plot?.i, crewTravelBonus]);

  const sampleBounds = CoreSample.getSampleBounds(lotAbundance, originalTonnage, sampleQualityBonus.totalBonus);
  const sampleTime = CoreSample.getSampleTime(sampleTimeBonus.totalBonus);

  const stats = useMemo(() => ([
    {
      label: 'Discovery Minimum',
      value: `${formatSampleMass(sampleBounds.lower)} tonnes`,
      direction: sampleQualityBonus.totalBonus > 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus > 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Minimum Yield"
          titleValue={`${formatSampleMass(sampleBounds.lower)} tonnes`} />
      )
    },
    {
      label: 'Discovery Maximum',
      value: `${formatSampleMass(sampleBounds.upper)} tonnes`,
      direction: sampleQualityBonus.totalBonus < 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus < 1 && (
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
  ]), [crewTravelBonus, crewTravelTime, sampleBounds, sampleQualityBonus, sampleTime, tripDetails]);

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
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <ImproveCoreSampleIcon />,
          headerBackground: coreSampleBackground,
          label: 'Improve Core Sample',
          completeLabel: 'Improved Sample',
          crewRequirement: 'duration',
        }}
        status={status}
        startTime={sample?.status === CoreSample.STATUS_FINISHED ? undefined : sample?.startTime}
        targetTime={sample?.status === CoreSample.STATUS_FINISHED ? undefined : sample?.completionTime}
        {...props} />

      <ExistingSampleSection
        plot={plot}
        improvableSamples={improvableSamples}
        onSelectSample={onSampleSelection}
        selectedSample={currentSample}
        resource={resources[resourceId]}
        resources={resources}
        status={status}
        overrideTonnage={isImproved && status === 'AFTER' ? sample?.initialYieldTonnage : undefined} />

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
          { label: 'Close', onClick: props.onClose },
          { label: 'Improve Again', onClick: onReset },
        ]}
        goDisabled={!currentSample}
        buttonsLoading={samplingStatus === 'FINISHING' || undefined}
        finalizeLabel="Analyze"
        goLabel="Begin Sample"
        onFinalize={finishSampling}
        onGo={() => startSampling(resourceId, currentSample?.sampleId)}
        status={samplingStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default ImproveCoreSample;