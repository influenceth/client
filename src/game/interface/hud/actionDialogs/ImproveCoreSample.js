import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid as AsteroidLib, CoreSample, Inventory } from '@influenceth/sdk';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import { CoreSampleIcon, ImproveCoreSampleIcon, ResourceIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import { useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import actionStage from '~/lib/actionStages';
import { formatTimer, getCrewAbilityBonus } from '~/lib/utils';

import {
  ActionDialogBody,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,

  getBonusDirection,
  formatSampleMass,
  TravelBonusTooltip,
  TimeBonusTooltip,
  MaterialBonusTooltip,
  EmptyResourceImage,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer, ProgressBarSection,
  CoreSampleSelectionDialog,
  SublabelBanner
} from './components';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';

const ImproveCoreSample = ({ asteroid, lot, coreSampleManager, stage, ...props }) => {
  const resources = useResourceAssets();
  const { startSampling, finishSampling, samplingStatus } = coreSampleManager;
  const { crew, crewMemberMap } = useCrewContext();

  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  
  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState();
  const [resourceId, setResourceId] = useState(props.preselect?.resourceId || (resourceMap?.active && resourceMap?.selected || undefined));
  const [sampleSelectorOpen, setSampleSelectorOpen] = useState(false);

  useEffect(() => {
    if (coreSampleManager.currentSample) {
      setSampleId(coreSampleManager.currentSample.sampleId);
      if (coreSampleManager.currentSample.resourceId !== resourceId) {
        setResourceId(coreSampleManager.currentSample.resourceId)
      }
      if (resourceMap?.active && coreSampleManager.currentSample.resourceId !== resourceMap?.selected) {
        dispatchResourceMapSelect(coreSampleManager.currentSample.resourceId);
        dispatchResourceMapToggle(true);
      }
    }
  }, [coreSampleManager.currentSample]);

  const onSelectSample = useCallback((s) => {
    if (s) {
      setSampleId(s.sampleId);
      setResourceId(s.resourceId);
  
      // if open to a different resource map, switch... if a resource map is not open, don't open one
      if (resourceMap?.active && resourceMap.selected !== s.resourceId) {
        dispatchResourceMapSelect(s.resourceId);
      }
    }
  }, [resourceMap?.active]);

  const sample = useMemo(() => {
    if (lot?.coreSamples) {
      if (resourceId && sampleId) {
        const thisSample = lot.coreSamples.find((s) => s.sampleId === sampleId && s.resourceId === resourceId);
        if (thisSample) {
          thisSample.initialYieldTonnage = Object.keys(thisSample).includes('initialYield')
            ? thisSample.initialYield * Inventory.RESOURCES[resourceId].massPerUnit
            : undefined;
          return thisSample;
        }
      }
    }
    return null;
  }, [lot?.coreSamples, sampleId, resourceId]);

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.resourceSeed || !asteroid.resources) return 0;
    return AsteroidLib.getAbundanceAtLot(
      asteroid?.i,
      BigInt(asteroid?.resourceSeed),
      Number(lot?.i),
      resourceId,
      asteroid.resources[resourceId]
    );
}, [asteroid, lot, resourceId]);

  // handle sample selection
  const [selectedSample, setSelectedSample] = useState();

  const improvableSamples = useMemo(() =>
    (lot?.coreSamples || [])
      .filter((c) => (c.owner === crew?.i && c.initialYield > 0 && c.status !== CoreSample.STATUS_USED))
      .map((c) => ({ ...c, tonnage: c.initialYield * resources[c.resourceId].massPerUnit }))
  , [lot?.coreSamples]);

  const onSampleSelection = useCallback((sample) => {
    if (sample.resourceId !== resourceId) {
      dispatchResourceMapSelect(sample.resourceId);
    }
    dispatchResourceMapToggle(true);
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

  const crewMembers = coreSampleManager.currentSample?._crewmates
    || ((crew?.crewMembers || []).map((i) => crewMemberMap[i]));
  const captain = crewMembers[0];
  const sampleTimeBonus = getCrewAbilityBonus(1, crewMembers);
  const sampleQualityBonus = getCrewAbilityBonus(2, crewMembers);
  const crewTravelBonus = getCrewAbilityBonus(3, crewMembers);

  // TODO: ...
  // const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
  //   if (!asteroid?.i || !lot?.i) return {};
  //   return getTripDetails(asteroid.i, crewTravelBonus.totalBonus, 1, [ // TODO
  //     { label: 'Travel to destination', lot: lot.i },
  //     { label: 'Return from destination', lot: 1 },
  //   ]);
  // }, [asteroid?.i, lot?.i, crewTravelBonus]);
  const crewTravelTime = 0;
  const tripDetails = null;

  const sampleBounds = CoreSample.getSampleBounds(lotAbundance, originalTonnage, sampleQualityBonus.totalBonus);
  const sampleTime = CoreSample.getSampleTime(sampleTimeBonus.totalBonus);

  const stats = useMemo(() => ([
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
  ]), [crewTravelBonus, crewTravelTime, sampleBounds, sampleQualityBonus, sampleTime, tripDetails]);

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

  const coreDrillSourceSelected = true; // TODO: ...

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ImproveCoreSampleIcon />,
          label: 'Optimize Deposit',
        }}
        captain={captain}
        crewAvailableTime={crewTravelTime + sampleTime}
        taskCompleteTime={crewTravelTime + sampleTime}
        stage={stage} />

      <ActionDialogBody>
        {stage === actionStage.COMPLETED && (
          <FlexSection>
            <FlexSectionInputBlock
              title="New Result"
              image={<ResourceThumbnail resource={resources[resourceId]} tooltipContainer="none" />}
              label={`${resources[resourceId]?.name} Deposit`}
              disabled
              style={{ width: '100%' }}
              sublabel={sample?.initialYieldTonnage && (
                <SublabelBanner color={theming[actionStage.COMPLETED].highlight}>
                  <ResourceIcon />
                  <span style={{ flex: 1 }}>{formatSampleMass(sample.initialYieldTonnage)}t</span>
                  <b>+{formatSampleMass(sample.initialYieldTonnage - originalTonnage)}t</b>
                </SublabelBanner>
              )}
            />
          </FlexSection>
        )}
        {stage !== actionStage.COMPLETED && (
          <FlexSection>
            <FlexSectionInputBlock
              title="Deposit"
              image={
                resourceId
                  ? <ResourceThumbnail resource={resources[resourceId]} tooltipContainer="none" />
                  : <EmptyResourceImage iconOverride={<CoreSampleIcon />} />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={resourceId ? resources[resourceId].name : 'Select'}
              onClick={() => setSampleSelectorOpen(true)}
              disabled={stage !== actionStage.NOT_STARTED}
              sublabel={
                resourceId
                ? <><ResourceIcon /> {formatSampleMass(originalTonnage)}t</>
                : 'Resource'
              }
            />
            
            <FlexSectionSpacer />

            <FlexSectionInputBlock
              title="Tool"
              image={
                resourceId  // TODO: this should be tool origin lot selected
                  ? <ResourceThumbnail badge="1" resource={resources[175]} tooltipContainer="none" />
                  : <EmptyResourceImage />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={coreDrillSourceSelected ? 'Core Drill' : 'Select'} // TODO: same as above, select an origin for tool
              onClick={() => { /*setSiteSelectorOpen(true)*/ }}
              disabled={stage !== actionStage.NOT_STARTED}
              sublabel={coreDrillSourceSelected ? 'Tool' : 'Core Drill'}
            />
          </FlexSection>
        )}

        {stage !== actionStage.NOT_STARTED && stage !== actionStage.COMPLETED && (
          <ProgressBarSection
            completionTime={sample?.completionTime}
            startTime={sample?.startTime}
            stage={stage}
            title="Progress"
            totalTime={crewTravelTime + sampleTime}
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats} />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!currentSample || !coreDrillSourceSelected}
        goLabel="Optimize"
        onGo={() => startSampling(resourceId, currentSample?.sampleId)}
        finalizeLabel="Analyze"
        onFinalize={finishSampling}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <CoreSampleSelectionDialog
          options={improvableSamples}
          initialSelection={currentSample}
          lotId={lot?.i}
          onClose={() => setSampleSelectorOpen(false)}
          onSelected={onSelectSample}
          open={sampleSelectorOpen}
          resources={resources}
        />
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const coreSampleManager = useCoreSampleManager(asteroid?.i, lot?.i);
  const { actionStage } = coreSampleManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage={coreSampleBackground}
      asteroid={asteroid}
      isLoading={isLoading}
      lot={lot}
      onClose={props.onClose}
      stage={actionStage}>
      <ImproveCoreSample
        asteroid={asteroid}
        lot={lot}
        coreSampleManager={coreSampleManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
