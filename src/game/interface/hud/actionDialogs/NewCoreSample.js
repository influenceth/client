import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid as AsteroidLib, CoreSample, Inventory, } from '@influenceth/sdk';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import { CoreSampleIcon } from '~/components/Icons';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  RawMaterialSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  formatSampleMass,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip
} from './components';

const NewCoreSample = ({ asteroid, plot, ...props }) => {
  const resources = useResourceAssets();
  const { startSampling, finishSampling, samplingStatus, ...coreSampleManager } = useCoreSampleManager(asteroid?.i, plot?.i);
  const { crew, crewMemberMap } = useCrew();

  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceId = useStore(s => s.asteroids.resourceMap?.active && s.asteroids.resourceMap?.selected);

  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState();
  useEffect(() => {
    if (coreSampleManager.currentSample) {
      setSampleId(coreSampleManager.currentSample.sampleId);
      if (coreSampleManager.currentSample.resourceId !== resourceId) {
        dispatchResourceMapSelect(coreSampleManager.currentSample.resourceId);
        dispatchResourceMapToggle(true);
      }
    }
  }, [coreSampleManager.currentSample]);

  const sample = useMemo(() => {
    if (plot?.coreSamples && resourceId && sampleId) {
      const thisSample = plot.coreSamples.find((s) => s.sampleId === sampleId && s.resourceId === resourceId);
      if (thisSample) {
        thisSample.initialYieldTonnage = Object.keys(thisSample).includes('initialYield')
          ? thisSample.initialYield * Inventory.RESOURCES[resourceId].massPerUnit
          : undefined;
        return thisSample;
      }
    }
    return null;
  }, [plot?.coreSamples, sampleId, resourceId]);

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

  const crewMembers = coreSampleManager.currentSample?._crewmates
    || ((crew?.crewMembers || []).map((i) => crewMemberMap[i]));
  const captain = crewMembers[0];
  const sampleTimeBonus = getCrewAbilityBonus(1, crewMembers);
  const sampleQualityBonus = getCrewAbilityBonus(2, crewMembers);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  // TODO: ...
  // TODO: the crew origin and destination lots are currently set to 1, and when
  //  that is updated, it will need to be persisted in the actionItem
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !plot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [
  //     { label: 'Travel to destination', plot: plot.i },
  //     { label: 'Return from destination', plot: 1 },
  //   ]);
  // }, [asteroid?.i, plot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const sampleBounds = CoreSample.getSampleBounds(lotAbundance, 0, sampleQualityBonus.totalBonus);
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
      isTimeStat: true,
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
      isTimeStat: true,
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
    if (sample?.initialYield !== undefined) {
      return 'AFTER';
    } else if (samplingStatus === 'READY') {
      return 'BEFORE';
    } else if (samplingStatus === 'SAMPLING') {
      return 'DURING';
    }
    return 'AFTER';
  }, [sample, samplingStatus]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (close on status change from)
    if (['READY'].includes(lastStatus.current)) {
      if (samplingStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = samplingStatus;
  }, [samplingStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <CoreSampleIcon />,
          headerBackground: coreSampleBackground,
          label: 'Core Sample',
          crewRequirement: 'duration',
        }}
        status={status}
        startTime={sample?.startTime}
        targetTime={sample?.completionTime}
        {...props} />

      <RawMaterialSection
        abundance={lotAbundance}
        resource={resources[resourceId]}
        status={status}
        tonnage={status === 'AFTER' ? sample?.initialYieldTonnage : undefined} />

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
        buttonsOverride={sample?.initialYield !== undefined && [
          { label: 'Close', onClick: props.onClose },
          // TODO: this should pass in selected sample
          { label: 'Improve Sample', onClick: () => { props.onSetAction('IMPROVE_CORE_SAMPLE', { preselect: { ...sample } }); } },
        ]}
        buttonsDisabled={samplingStatus === 'READY' && lotAbundance === 0}
        buttonsLoading={samplingStatus === 'FINISHING' || undefined}
        finalizeLabel="Analyze"
        goLabel="Begin Sample"
        onFinalize={finishSampling}
        onGo={() => startSampling(resourceId)}
        status={samplingStatus === 'FINISHING' ? 'DURING' : status} />
    </>
  );
};

export default NewCoreSample;