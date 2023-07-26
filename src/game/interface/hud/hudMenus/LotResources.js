import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Deposit, Product } from '@influenceth/sdk';

import useActionButtons from '~/hooks/useActionButtons';
import useAsteroid from '~/hooks/useAsteroid';
import useCoreSampleManager from '~/hooks/useCoreSampleManager';
import useExtractionManager from '~/hooks/useExtractionManager';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Tray, trayHeight } from './components';
import { hexToRGB } from '~/theme';
import { CoreSampleIcon, PlusIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useCrewContext from '~/hooks/useCrewContext';
import { formatFixed, keyify } from '~/lib/utils';
import actionButtons from '../actionButtons';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  max-height: calc(100% - ${trayHeight}px);
`;

const Circle = styled.div`
  background: currentColor;
  border-radius: 8px;
  display: inline-block;
  height: 8px;
  margin: 0 8px;
  width: 8px;
`;

const Row = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 2px 0;
  min-height: 32px;
  & > div:first-child {
    margin-left: 2px;
    margin-right: 6px;
  }
  & > label {
    flex: 1;
  }
  & > span {
    color: #999;
    padding-right: 8px;
  }
`;

const ShowMoreRow = styled(Row)`
  color: #777;
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Resource = styled(Row)`
  cursor: ${p => p.theme.cursors.active};
  &:hover {
    background: rgba(${p => hexToRGB(p.theme.colors.resources[p.category])}, 0.15);
  }
  ${p => p.selected && `
    background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.3);
    label {
      color: white !important;
    }
    span {
      color: white;
    }
  `}

  ${Circle}, label, svg {
    color: ${p => p.theme.colors.resources[p.category]};
  }
`;

const Sample = styled(Resource)`
  & > svg {
    font-size: 22px;
  }
  & > label {
    color: white;
  }
`;

const Used = styled.span`
  color: ${p => p.theme.colors.error} !important;
`;
const Depleted = styled.span`
  color: ${p => p.theme.colors.error} !important;
`;
const InProgress = styled.span`
  color: ${p => p.theme.colors.main} !important;
`;


const LotResources = () => {
  const { props: actionProps } = useActionButtons();
  const { crew } = useCrewContext();
  const { asteroidId, lotId } = useStore(s => s.asteroids.lot || {});
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lot } = useLot(asteroidId, lotId);
  const { currentSample } = useCoreSampleManager(asteroidId, lotId);
  const { currentExtraction } = useExtractionManager(asteroidId, lotId);

  const [showAllAbundances, setShowAllAbundances] = useState();
  const [showAllSamples, setShowAllSamples] = useState();

  // get lot abundance
  const lotAbundances = useMemo(() => {
    if (!(asteroid && lot)) return [];
    // TODO: do this in worker? takes about 200ms on decent cpu
    return Object.keys(asteroid?.resources || {})
      .reduce((acc, i) => {
        if (asteroid.resources[i] > 0) {
          acc.push({
            i,
            abundance: Asteroid.getAbundanceAtLot(
              asteroid.i,
              BigInt(asteroid.resourceSeed),
              Number(lot.i),
              i,
              asteroid.resources[i]
            )
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.abundance - a.abundance);
  }, [asteroid, lot]);

  const [selected, setSelected] = useState();

  const onClickResource = useCallback((i) => () => {
    setSelected({ type: 'resource', i });
  }, []);
  const onClickSample = useCallback((r, i) => () => {
    setSelected({ type: 'sample', r, i });
  }, []);

  const [showAbundances, abundancesTruncated] = useMemo(() => {
    if (showAllAbundances || lotAbundances.length < 8) {
      return [lotAbundances, false];
    } else {
      return [lotAbundances.slice(0, 5), true];
    }
  }, [lotAbundances, showAllAbundances]);

  const [ownedSamples, depletedSamples] = useMemo(() => ([
    (lot?.coreSamples || [])
      .filter((s) => s.owner === crew?.i)
      .filter((s) => !s.initialYield || showAllSamples || s.remainingYield > 0)
      .sort((a, b) => {
        if (!a.initialYield && !b.initialYield) {
          return b.remainingYield - a.remainingYield;
        }
        return b.initialYield ? -1 : 1;
      }),
    (lot?.coreSamples || [])
      .filter((s) => s.owner === crew?.i)
      .filter((s) => s.initialYield > 0 && s.remainingYield === 0),
  ]), [crew?.i, lot?.coreSamples, showAllSamples]);

  const getSampleYield = useCallback((sample) => {
    if (sample.initialYield) {
      if (sample.remainingYield > 0) {
        if (sample.initialYield === sample.remainingYield) {
          return `${formatFixed(sample.remainingYield / 1e3, 0)} t`;
        }
        return <>{formatFixed(sample.remainingYield / 1e3, 0)} t <Used>(partial)</Used></>;
      }
      return <Depleted>Depleted</Depleted>;
    }
    return <InProgress>In progress...</InProgress>;
  }, []);

  const selectedResource = useMemo(() => {
    if (selected && selected.type === 'resource') {
      return Product.TYPES[selected.i];
    }
    return null;
  }, [selected]);

  const selectedSample = useMemo(() => {
    if (selected && selected.type === 'sample') {
      return ownedSamples.find((s) => selected.r === s.resourceId && selected.i === s.sampleId);
    }
    return null;
  }, [ownedSamples, selected]);

  const extraSampleParams = useMemo(() => {
    const params = {};
    if (!currentSample) {
      if (selectedResource?.i) {
        params.overrideResourceId = Number(selectedResource?.i);
      } else if (selectedSample) {
        params.improveSample = { ...selectedSample };
        params._disabled = !(selectedSample?.status === Deposit.STATUSES.SAMPLED && selectedSample?.initialYield === selectedSample?.remainingYield);
      }
    }
    return params;
  }, [currentSample, selectedResource, selectedSample]);

  const extraExtractParams = useMemo(() => {
    const params = {};
    if (!currentExtraction) {
      if (selectedSample) {
        params.preselect = { ...selectedSample };
        if (selectedSample.remainingYield === 0) {
          params._disabled = true;
        }
      }
    }
    return params;
  }, [currentExtraction, selectedSample]);

  const sampleTally = showAllSamples
    ? (ownedSamples.length - depletedSamples.length)
    : ownedSamples.length;
  
  // TODO: for core samples, style more like original mock

  // TODO: also consider one-at-a-time accordion or larger min-height
  //  OR someother flex strategy

  return (
    <>
      <Wrapper>
          <HudMenuCollapsibleSection titleText="Lot Resources" titleLabel="Abundance">
            <div style={{ height: '100%', overflow: 'hidden' }}>
            {showAbundances.map(({ i, abundance }) => {
              const { name, category } = Product.TYPES[i];
              const categoryKey = keyify(category);
              const isSelected = selected?.type === 'resource' && selected?.i === i;
              return (
                <Resource
                  key={i}
                  category={categoryKey}
                  onClick={onClickResource(i)}
                  selected={isSelected}>
                  {isSelected
                    ? <ResourceThumbnail resource={Product.TYPES[i]} size="75px" tooltipContainer="null" />
                    : <Circle />}
                  <label>{name}</label>
                  <span>{(abundance * 100).toFixed(1)}%</span>
                </Resource>
              );
            })}
            {abundancesTruncated && (
              <ShowMoreRow onClick={() => setShowAllAbundances(true)}>
                <PlusIcon />
                <label>
                  Show {lotAbundances.length - 5} more...
                </label>
              </ShowMoreRow>
            )}
            </div>
          </HudMenuCollapsibleSection>
          
          <HudMenuCollapsibleSection titleText="Core Samples" titleLabel={`${sampleTally} Sample${sampleTally === 1 ? '' : 's'}`}>
            {ownedSamples.map((sample) => {
              const { name, category } = Product.TYPES[sample.resourceId];
              const categoryKey = keyify(category);
              const isSelected = selected?.type === 'sample' && selected?.r === sample.resourceId && selected?.i === sample.sampleId;
              return (
                <Sample
                  key={sample.i}
                  category={categoryKey}
                  onClick={onClickSample(sample.resourceId, sample.sampleId)}
                  selected={isSelected}>
                  {isSelected
                    ? (
                      <ResourceThumbnail
                        resource={Product.TYPES[sample.resourceId]}
                        iconBadge={<CoreSampleIcon />}
                        size="75px"
                        tooltipContainer="hudeMenu" />
                    )
                    : <CoreSampleIcon />}
                  <label>{name}{isSelected ? '' : ' Deposit'}</label>
                  <span>{getSampleYield(sample)}</span>
                </Sample>
              );
            })}
            {!showAllSamples && depletedSamples?.length > 0 && (
              <ShowMoreRow onClick={() => setShowAllSamples(true)}>
                <PlusIcon />
                <label>
                  Show {depletedSamples.length} depleted...
                </label>
              </ShowMoreRow>
            )}
          </HudMenuCollapsibleSection>
          
          <HudMenuCollapsibleSection titleText="For Sale" titleLabel={`0 Samples`} borderless collapsed>
          </HudMenuCollapsibleSection>
      </Wrapper>

      {(currentSample || selectedResource || selectedSample || currentExtraction) && (
        <Tray>
          <>
            {(currentSample || selectedResource || selectedSample) && (
              <actionButtons.CoreSample {...actionProps} {...extraSampleParams} />
            )}
            {/* TODO: list sample for sale */}
            {/* TODO: purchase sample for sale (if one is selected) */}
            {(currentExtraction || selectedSample) && (
              <actionButtons.Extract {...actionProps} {...extraExtractParams} />
            )}
          </>
        </Tray>
      )}
    </>
  );
};

export default LotResources;