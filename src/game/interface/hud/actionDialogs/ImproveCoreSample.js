import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Asteroid, Crewmate, Deposit, Lot, Product, Time } from '@influenceth/sdk';

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

// TODO: combine this ui with "NewCoreSample" dialog if possible
const ImproveCoreSample = ({ asteroid, lot, coreSampleManager, stage, ...props }) => {
  const { currentSamplingAction, startImproving, finishSampling, samplingStatus } = coreSampleManager;
  const { crew, crewmateMap } = useCrewContext();
  const { data: originEntity } = useEntity(currentSamplingAction?.origin ? { ...currentSamplingAction.origin } : props.preselect?.origin);

  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const resourceMap = useStore(s => s.asteroids.resourceMap);
  
  // if an active sample is detected, set "sample" for remainder of dialog's lifespan
  const [sampleId, setSampleId] = useState(props.preselect?.id);
  const [drillSource, setDrillSource] = useState();
  const [sampleSelectorOpen, setSampleSelectorOpen] = useState(false);
  const [sourceSelectorOpen, setSourceSelectorOpen] = useState(false);

  const improvableSamples = useMemo(() => {
    return (lot?.deposits || [])
      .filter((c) => (c.Control.controller.id === crew?.id && c.Deposit.initialYield > 0 && c.Deposit.status !== Deposit.STATUSES.USED))
      .map((c) => ({ ...c, tonnage: c.Deposit.initialYield * Product.TYPES[c.Deposit.resource].massPerUnit }));
  }, [lot?.deposits]);

  const [selectedSample, resourceId, initialYieldTonnage] = useMemo(() => {
    const selected = (improvableSamples || []).find((s) => s.id === sampleId);
    const initialYield = selected?.Deposit.initialYield || 0;
    const initialYieldTonnage = initialYield * (Product.TYPES[selected?.Deposit.resource]?.massPerUnit || 0);
    return [
      selected,
      selected?.Deposit.resource,
      initialYieldTonnage
    ];
  }, [improvableSamples, sampleId]);

  useEffect(() => {
    if (currentSamplingAction?.sampleId) {
      setSampleId(currentSamplingAction.sampleId);
    } else {
      let defaultSelection;
      if (props.preselect) {
        defaultSelection = (improvableSamples || []).find((s) => s.id === props.preselect.id);
      } else if (improvableSamples.length === 1) {
        defaultSelection = improvableSamples[0];
      }
      if (defaultSelection) {
        setSampleId(defaultSelection?.id);
      }
    }

    if (originEntity) {
      const { lotIndex } = locationsArrToObj(originEntity.Location.locations || []);
      setDrillSource({
        lotIndex,
        slot: currentSamplingAction?.originSlot || null
      });
    }
  }, [currentSamplingAction, originEntity, improvableSamples, props.preselect]);

  const lotAbundance = useMemo(() => {
    if (!resourceId || !asteroid?.Celestial?.abundances || !lot?.id) return 0;
    return Asteroid.Entity.getAbundanceAtLot(asteroid, Lot.toIndex(lot.id), resourceId);
  }, [asteroid, lot, resourceId]);

  const originalYield = useMemo(() => selectedSample?.Deposit?.initialYield, [selectedSample?.id]); // only update on id change
  const originalTonnage = useMemo(() => originalYield ? originalYield * Product.TYPES[selectedSample?.Deposit.resource]?.massPerUnit : 0, [selectedSample, originalYield]);


  useEffect(() => {
    // if open to a different resource map, switch... if a resource map is not open, don't open one
    if (resourceId && resourceMap?.active && resourceMap.selected !== resourceId) {
      dispatchResourceMapSelect(resourceId);
    }
  }, [resourceId, resourceMap]);

  const crewmates = currentSamplingAction?._crewmates || ((crew?._crewmates || []).map((i) => crewmateMap[i]));
  const captain = crewmates[0];

  const [crewTravelBonus, sampleQualityBonus, sampleTimeBonus] = useMemo(() => {
    const bonusIds = [Crewmate.ABILITY_IDS.HOPPER_TRANSPORT_TIME, Crewmate.ABILITY_IDS.CORE_SAMPLE_QUALITY, Crewmate.ABILITY_IDS.CORE_SAMPLE_TIME];
    const abilities = getCrewAbilityBonuses(bonusIds, crew);
    return bonusIds.map((id) => abilities[id] || {});
  }, [crew]);

  const { totalTime: crewTravelTime, tripDetails } = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id) return {};
    const crewLotIndex = Lot.toIndex(crew?._location?.lotId);
    return getTripDetails(asteroid.id, crewTravelBonus, crewLotIndex, [
      { label: 'Travel to Sampling Site', lotIndex: Lot.toIndex(lot.id) },
      { label: 'Return to Crew Station', lotIndex: crewLotIndex },
    ], crew?._timeAcceleration);
  }, [asteroid?.id, lot?.id, crew?._location?.lotId, crew?._timeAcceleration, crewTravelBonus]);
  
  const [sampleBounds, sampleTime] = useMemo(() => {
    return [
      lotAbundance ? Deposit.getSampleBounds(lotAbundance, originalYield, sampleQualityBonus.totalBonus) : null,
      Time.toRealDuration(Deposit.getSampleTime(sampleTimeBonus.totalBonus), crew?._timeAcceleration)
    ];
  }, [lotAbundance, originalYield, sampleQualityBonus, sampleTimeBonus, crew?._timeAcceleration]);

  const [crewTimeRequirement, taskTimeRequirement] = useMemo(() => {
    if (!asteroid?.id || !crew?._location?.lotId || !lot?.id || !drillSource?.lotIndex) return [];
    const oneWayCrewTravelTime = crewTravelTime / 2;
    const drillTravelTime = Time.toRealDuration(
      Asteroid.getLotTravelTime(asteroid.id, drillSource?.lotIndex, Lot.toIndex(lot.id), crewTravelBonus.totalBonus),
      crew?._timeAcceleration
    );
    return [
      Math.max(oneWayCrewTravelTime, drillTravelTime) + sampleTime + oneWayCrewTravelTime,
      Math.max(oneWayCrewTravelTime, drillTravelTime) + sampleTime
    ];
  }, [asteroid?.id, crew?._location?.lotId, crew?._timeAcceleration, drillSource?.lotIndex, lot?.id, crewTravelBonus]);

  const stats = useMemo(() => ([
    {
      label: 'Crew Travel',
      value: formatTimer(crewTravelTime),
      direction: getBonusDirection(crewTravelBonus),
      isTimeStat: true,
      timeAcceleration: crew?._timeAcceleration,
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
      timeAcceleration: crew?._timeAcceleration,
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
      value: sampleBounds ? `${formatSampleMass(sampleBounds?.lower)} tonnes` : '',
      direction: sampleQualityBonus.totalBonus > 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus > 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Minimum Yield"
          titleValue={`${formatSampleMass(sampleBounds?.lower)} tonnes`} />
      )
    },
    {
      label: 'Discovery Maximum',
      value: sampleBounds ? `${formatSampleMass(sampleBounds?.upper)} tonnes` : '',
      direction: sampleQualityBonus.totalBonus < 1 ? getBonusDirection(sampleQualityBonus) : 0,
      tooltip: sampleQualityBonus.totalBonus < 1 && (
        <MaterialBonusTooltip
          bonus={sampleQualityBonus}
          title="Maximum Yield"
          titleValue={`${formatSampleMass(sampleBounds?.upper)} tonnes`} />
      )
    },
  ]), [crew?._timeAcceleration, crewTravelBonus, crewTravelTime, sampleBounds, sampleQualityBonus, sampleTime, tripDetails]);

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
        actionCrew={crew}
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
        disabled={stage === actionStage.NOT_STARTED && (!selectedSample || !drillSource)}
        goLabel="Optimize"
        onGo={() => startImproving(selectedSample?.id, drillSource)}
        finalizeLabel="Analyze"
        onFinalize={finishSampling}
        stage={stage}
        waitForCrewReady
        {...props} />

      {stage === actionStage.NOT_STARTED && (
        <>
          <CoreSampleSelectionDialog
            options={improvableSamples}
            initialSelection={selectedSample}
            lotId={lot?.id}
            onClose={() => setSampleSelectorOpen(false)}
            onSelected={(s) => setSampleId(s?.id)}
            open={sampleSelectorOpen}
          />

          <InventorySelectionDialog
            asteroidId={asteroid.id}
            otherEntity={lot}
            itemIds={[Product.IDS.CORE_DRILL]}
            isSourcing
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
      actionImage="CoreSample"
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
