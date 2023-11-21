import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crew, Crewmate, Deposit, Lot, Product } from '@influenceth/sdk';

import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import { CoreSampleIcon, ImproveCoreSampleIcon, ResourceIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import actionStage from '~/lib/actionStages';
import { reactBool, formatTimer, locationsArrToObj, getCrewAbilityBonuses } from '~/lib/utils';

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
  SublabelBanner,
  getTripDetails,
  InventorySelectionDialog
} from './components';
import { ActionDialogInner, theming, useAsteroidAndLot } from '../ActionDialog';
import useEntity from '~/hooks/useEntity';

const ImproveCoreSample = ({ asteroid, lot, coreSampleManager, stage, ...props }) => {
  const { currentSamplingAction, startImproving, finishSampling, samplingStatus } = coreSampleManager;
  const { crew, crewmateMap } = useCrewContext();
  const { data: originEntity } = useEntity(currentSamplingAction?.origin ? { ...currentSamplingAction.origin } : props.preselect?.origin);

  console.log({ 'preselect': props.preselect, currentSamplingAction });

  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  
  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState(props.preselect?.id);
  const [resourceId, setResourceId] = useState(resourceMap?.active && resourceMap?.selected || undefined);
  const [drillSource, setDrillSource] = useState();
  const [sampleSelectorOpen, setSampleSelectorOpen] = useState(false);
  const [sourceSelectorOpen, setSourceSelectorOpen] = useState(false);

  useEffect(() => {
    if (currentSamplingAction) {
      setSampleId(currentSamplingAction.sampleId);
      if (originEntity) {
        const { lotIndex } = locationsArrToObj(originEntity.Location.locations || []);
        setDrillSource({
          lotIndex,
          slot: currentSamplingAction.origin_slot
        });
      }
      if (currentSamplingAction.resourceId !== resourceId) {
        setResourceId(currentSamplingAction.resourceId)
      }
      if (resourceMap?.active && currentSamplingAction.resourceId !== resourceMap?.selected) {
        dispatchResourceMapSelect(currentSamplingAction.resourceId);
        dispatchResourceMapToggle(true);
      }
    }
  }, [currentSamplingAction, originEntity]);

  const onSelectSample = useCallback((s) => {
    if (s) {
      setSampleId(s.id);
      setResourceId(s.Deposit.resource);
  
      // if open to a different resource map, switch... if a resource map is not open, don't open one
      if (resourceMap?.active && resourceMap.selected !== s.Deposit.resource) {
        dispatchResourceMapSelect(s.Deposit.resource);
      }
    }
  }, [resourceMap?.active]);

  const [sample, initialYieldTonnage] = useMemo(() => {
    if (lot?.deposits && resourceId && sampleId) {
      const thisSample = lot.deposits.find((s) => s.id === sampleId && s.Deposit.resource === resourceId);
      if (thisSample) {
        const initialYieldTonnage = thisSample.Deposit.initialYield
          ? thisSample.Deposit.initialYield * Product.TYPES[resourceId].massPerUnit
          : undefined;
        return [thisSample, initialYieldTonnage];
      }
    }
    return [null, 0];
  }, [lot?.deposits, sampleId, resourceId]);

  // get lot abundance
  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.Celestial?.abundances || !lot?.id) return 0;
    return Asteroid.Entity.getAbundanceAtLot(asteroid, Lot.toIndex(lot.id), resourceId);
}, [asteroid, lot, resourceId]);

  // handle sample selection
  const [selectedSample, setSelectedSample] = useState();

  const improvableSamples = useMemo(() => {
    return (lot?.deposits || [])
      .filter((c) => (c.Control.controller.id === crew?.id && c.Deposit.initialYield > 0 && c.Deposit.status !== Deposit.STATUSES.USED))
      .map((c) => ({ ...c, tonnage: c.Deposit.initialYield * Product.TYPES[c.Deposit.resource].massPerUnit }));
  }, [lot?.deposits]);

  const onSampleSelection = useCallback((sample) => {
    if (sample.Deposit.resource !== resourceId) {
      dispatchResourceMapSelect(sample.Deposit.resource);
    }
    dispatchResourceMapToggle(true);
    setSelectedSample(sample);
  }, [resourceId]);

  useEffect(() => {
    let defaultSelection;
    if (props.preselect) {
      defaultSelection = improvableSamples.find((s) => s.id === props.preselect.id);
    } else if (improvableSamples.length === 1) {
      defaultSelection = improvableSamples[0];
    }
    if (defaultSelection) {
      onSampleSelection(defaultSelection);
    }
  }, [improvableSamples, props.preselect]);

  const existingSample = sample || selectedSample;
  const originalYield = useMemo(() => existingSample?.Deposit?.initialYield, [existingSample?.id]); // only update on id change
  const originalTonnage = useMemo(() => originalYield ? originalYield * Product.TYPES[existingSample.Deposit.resource].massPerUnit : 0, [existingSample, originalYield]);

  const crewmates = currentSamplingAction?._crewmates || ((crew?._crewmates || []).map((i) => crewmateMap[i]));
  const captain = crewmates[0];

  const [sampleTimeBonus, sampleQualityBonus, crewTravelBonus] = useMemo(() => {
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.CORE_SAMPLE_QUALITY, Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id || !drillSource?.lotIndex) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus.totalBonus, crewLotIndex, [
      { label: 'Travel to Sampling Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ]);
  }, [asteroid?.id, crew?._location?.lotId, drillSource?.lotIndex, lot?.id, crewTravelBonus]);
  
  const sampleBounds = Deposit.getSampleBounds(lotAbundance, 0, sampleQualityBonus.totalBonus);
  const sampleTime = Deposit.getSampleTime(sampleTimeBonus.totalBonus);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id || !drillSource?.lotIndex) return [];
    const oneWayCrewTravelTime = crewTravelTime / 2;
    const drillTravelTime = Asteroid.getLotTravelTime(asteroid.id, drillSource?.lotIndex, Lot.toIndex(lot.id), crewTravelBonus.totalBonus);
    return [
      Math.max(oneWayCrewTravelTime, drillTravelTime) + sampleTime + oneWayCrewTravelTime,
      Math.max(oneWayCrewTravelTime, drillTravelTime) + sampleTime
    ];
  }, [asteroid?.id, crew?._location?.lotId, drillSource?.lotIndex, lot?.id, crewTravelBonus]);

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

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <ImproveCoreSampleIcon />,
          label: 'Optimize Deposit',
        }}
        captain={captain}
        location={{ asteroid, lot }}
        crewAvailableTime={crewTimeRequirement}
        taskCompleteTime={taskTimeRequirement}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        {stage === actionStage.COMPLETED && (
          <FlexSection>
            <FlexSectionInputBlock
              title="New Result"
              image={<ResourceThumbnail resource={Product.TYPES[resourceId]} tooltipContainer="none" />}
              label={`${Product.TYPES[resourceId]?.name} Deposit`}
              disabled
              style={{ width: '100%' }}
              sublabel={initialYieldTonnage && (
                <SublabelBanner color={theming[actionStage.COMPLETED].highlight}>
                  <ResourceIcon />
                  <span style={{ flex: 1 }}>{formatSampleMass(initialYieldTonnage)}t</span>
                  <b>+{formatSampleMass(initialYieldTonnage - originalTonnage)}t</b>
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
                  ? <ResourceThumbnail resource={Product.TYPES[resourceId]} tooltipContainer="none" />
                  : <EmptyResourceImage iconOverride={<CoreSampleIcon />} />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={resourceId ? Product.TYPES[resourceId].name : 'Select'}
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
                drillSource
                  ? <ResourceThumbnail badge="1" resource={Product.TYPES[175]} tooltipContainer="none" />
                  : <EmptyResourceImage />
              }
              isSelected={stage === actionStage.NOT_STARTED}
              label={drillSource ? 'Core Drill' : 'Select'} // TODO: same as above, select an origin for tool
              onClick={() => setSourceSelectorOpen(true)}
              disabled={stage !== actionStage.NOT_STARTED}
              sublabel={drillSource ? 'Tool' : 'Select'}
            />
          </FlexSection>
        )}

        {stage !== actionStage.NOT_STARTED && stage !== actionStage.COMPLETED && (
          <ProgressBarSection
            finishTime={currentSamplingAction?.finishTime}
            startTime={currentSamplingAction?.startTime}
            stage={stage}
            title="Progress"
            totalTime={taskTimeRequirement}
          />
        )}

        <ActionDialogStats
          stage={stage}
          stats={stats} />

      </ActionDialogBody>

      <ActionDialogFooter
        disabled={!existingSample || !drillSource}
        goLabel="Optimize"
        onGo={() => startImproving(existingSample?.id, drillSource)}
        finalizeLabel="Analyze"
        onFinalize={finishSampling}
        stage={stage}
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <CoreSampleSelectionDialog
            options={improvableSamples}
            initialSelection={existingSample}
            lotId={lot?.id}
            onClose={() => setSampleSelectorOpen(false)}
            onSelected={onSelectSample}
            open={sampleSelectorOpen}
          />

          <InventorySelectionDialog
            otherLotId={lot?.id}
            itemIds={[175]}
            onClose={() => setSourceSelectorOpen(false)}
            onSelected={setDrillSource}
            open={sourceSelectorOpen}
            requirePresenceOfItemIds
          />
        </>
      )}
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const coreSampleManager = useCoreSampleManager(lot?.id);
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
      isLoading={reactBool(isLoading)}
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
