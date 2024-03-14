import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Asteroid, Building, Deposit, Lot, Product } from '@influenceth/sdk';

import { CoreSampleIcon, MyAssetIcon, PlusIcon, ResourceIcon, SwayIcon } from '~/components/Icons';
import ResourceThumbnail from '~/components/ResourceThumbnail';
import useCoreSampleManager from '~/hooks/actionManagers/useCoreSampleManager';
import useExtractionManager from '~/hooks/actionManagers/useExtractionManager';
import useActionButtons from '~/hooks/useActionButtons';
import useAsteroid from '~/hooks/useAsteroid';
import useCrewContext from '~/hooks/useCrewContext';
import useLot from '~/hooks/useLot';
import useStore from '~/hooks/useStore';
import { formatFixed, formatPrice, keyify } from '~/lib/utils';
import { hexToRGB } from '~/theme';
import actionButtons from '../../actionButtons';
import { HudMenuCollapsibleSection, Scrollable, Tray, trayHeight } from './components';
import Button from '~/components/ButtonAlt';
import EntityLink from '~/components/EntityLink';
import { ListForSaleInner } from './ListForSalePanel';
import usePrivateSaleManager from '~/hooks/actionManagers/usePrivateSaleManager';

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
  ${p => p.selected
    ? `
      background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.15);
      border: 1px solid rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.45);
      & > span {
        color: white;
      }
    `
    : `
      cursor: ${p.theme.cursors.active};
      &:hover {
        background: rgba(${hexToRGB(p.theme.colors.resources[p.category])}, 0.05);
      }
    `
  }

  ${Circle}, label, svg {
    color: ${p => p.theme.colors.resources[p.category]};
  }
`;

const Sample = styled(Resource)`
  & > div:first-child {
    margin: 4px 6px;
  }
  & > svg {
    font-size: 22px;
    margin-right: 6px;
  }
  & > label {
    color: white;
  }
`;

const SelectedDeposit = styled.div`
  width: 100%;
`;

const PrimaryInfo = styled.div`
  display: flex;
`;
const Details = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  margin-top: 8px;
  padding: 8px 0 2px 2px;
`;
const SaleInfo = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 34px;
  width: 100%;
  & > label {
    ${p => p.notForSale
      ? `color: #888;`
      : `
        color: white;
        display: flex;
        font-size: 22px;
        & > svg {
          font-size: 26px;
          color: white;
        }
      `
    }
  }
  & > span {
    color: #888;
    & > a {
      color: white;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

const YieldWrapper = styled.span`
  align-items: center;
  display: flex;
  & svg {
    font-size: 18px;
    margin-right: 3px;
  }
  & > span {
    color: ${p => p.color};
    display: flex;
    & > span,
    & > svg { color: inherit; }
  }
  & > svg {
    color: ${p => p.theme.colors.main};
  }
`;

const Unused = styled.span`
  color: white !important;
  &:before { content: "Unused"; }
`;
const Used = styled.span`
  color: #888 !important;
  &:before { content: "Used"; }
`;
const Depleted = styled.span`
  color: ${p => p.theme.colors.error} !important;
  &:before { content: "Depleted"; }
`;

const DepositInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: center;
  padding-left: 8px;
  & > label {
    margin-bottom: 2px;
  }
`;

const getYieldColor = (sample) => {
  if (sample.Deposit.initialYield) {
    if (sample.Deposit.remainingYield > 0) {
      if (sample.Deposit.initialYield !== sample.Deposit.remainingYield) {
        // partially used
      }
      return '#a97c4f';
    }
    return 'brown';
  }
  return '#555';
};

const sampleSort = (a, b) => {
  if (!a.Deposit.initialYield && !b.Deposit.initialYield) {
    return b.Deposit.remainingYield - a.Deposit.remainingYield;
  }
  return b.Deposit.initialYield ? -1 : 1;
};

const Yield = ({ isMine, sample }) => (
  <YieldWrapper color={getYieldColor(sample)}>
    {isMine && <MyAssetIcon />}
    {sample.Deposit.status >= Deposit.STATUSES.SAMPLED
      ? <span><ResourceIcon style={{ fontSize: '22px' }} /> <span>{formatFixed(sample.Deposit.remainingYield / 1e3, 0)} t</span></span>
      : <>(unanalyzed)</>
    }
  </YieldWrapper>
);

const SaleDetails = ({ isMine, sample }) => {
  const { updateListing, isPendingUpdate } = usePrivateSaleManager(sample);
  const [editing, setEditing] = useState();
  
  const originalPrice = useMemo(() => (sample?.PrivateSale?.price || 0) / 1e6, [sample?.PrivateSale?.price]);

  return editing
    ? (
      <div style={{ marginTop: 8, width: '100%' }}>
        <ListForSaleInner
          forSaleWarning="For-Sale Deposits can be purchased by the operator of an Extractor on this lot, and only during extraction or improvement."
          isSaving={isPendingUpdate}
          onCancel={() => setEditing(false)}
          onSave={updateListing}
          originalPrice={originalPrice} />
      </div>
    )
    : (
      <Details>
        <SaleInfo notForSale={!(originalPrice > 0)}>
          <label>{originalPrice > 0 ? <><SwayIcon /> <span>{formatPrice(originalPrice)}</span></> : 'Not for Sale'}</label>
          {isMine && (
            <Button size="small" onClick={() => setEditing((e) => !e)}>
              {originalPrice > 0 ? 'Edit Sale' : 'List for Sale'}
            </Button>
          )}
          {!isMine && originalPrice > 0 && (
            <span>Sold by <EntityLink id={sample?.Control?.controller?.id} label={sample?.Control?.controller?.label} /></span>
          )}
        </SaleInfo>
      </Details>
    )
  ;
};

const DepositSection = ({ deposits = [], depleted = [], selected, onSelect, title }) => {
  const { crew } = useCrewContext();
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);

  const [showAll, setShowAll] = useState();
  
  const onClickSample = useCallback((id) => () => {
    onSelect({ type: 'sample', id });
    dispatchResourceMapToggle(false); // TODO: instead of turning off the resource map, should this change it the resource of the selected sample?
  }, [onSelect]);

  const samples = useMemo(() => {
    if (showAll) return [...deposits, ...depleted];
    return deposits;
  }, [deposits, depleted, showAll]);

  return (
    <HudMenuCollapsibleSection
      titleText={title}
      titleLabel={`${deposits.length} Sample${deposits.length === 1 ? '' : 's'}`}
      borderless
      collapsed={!(deposits.length > 0) || (selected?.type === 'resource')}>
      {samples.map((sample) => {
        const { name, category } = Product.TYPES[sample.Deposit.resource];
        const categoryKey = keyify(category);
        const isSelected = selected?.type === 'sample' && selected?.id === sample.id;
        
        return (
          <Sample
            key={sample.id}
            category={categoryKey}
            onClick={onClickSample(sample.id)}
            selected={isSelected}>
            {isSelected
              ? (
                <SelectedDeposit>
                  <PrimaryInfo>
                    <div>
                      <ResourceThumbnail
                        resource={Product.TYPES[sample.Deposit.resource]}
                        iconBadge={<CoreSampleIcon />}
                        size="75px"
                        tooltipContainer="hudMenu" />
                    </div>
                    <DepositInfo>
                      <label>{name}</label>
                      {sample.Deposit.initialYield
                        ? (
                          <div>
                            {sample.Deposit.remainingYield > 0
                              ? (sample.Deposit.initialYield === sample.Deposit.remainingYield ? <Unused /> : <Used />)
                              : <Depleted />
                            }
                          </div>
                        )
                        : null
                      }
                    </DepositInfo>
                    <Yield isMine={sample.Control.controller.id === crew?.id} sample={sample} />
                  </PrimaryInfo>
                  <SaleDetails isMine={sample.Control.controller.id === crew?.id} sample={sample} />
                </SelectedDeposit>
              )
              : (
                <>
                  <CoreSampleIcon />
                  <label>{name}</label>
                  <Yield isMine={sample.Control.controller.id === crew?.id} sample={sample} />
                </>
              )
            }
          </Sample>
        );
      })}
      {!showAll && depleted?.length > 0 && (
        <ShowMoreRow onClick={() => setShowAll(true)}>
          <PlusIcon />
          <label>
            Show {depleted.length} depleted...
          </label>
        </ShowMoreRow>
      )}
    </HudMenuCollapsibleSection>
  )
};

const LotResources = () => {
  const { props: actionProps } = useActionButtons();
  const { crew } = useCrewContext();
  const lotId = useStore(s => s.asteroids.lot);
  const asteroidId = useMemo(() => Lot.toPosition(lotId)?.asteroidId, [lotId]);

  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lot } = useLot(lotId);
  const { currentSamplingAction } = useCoreSampleManager(lotId);
  const { currentExtraction } = useExtractionManager(lotId);
  const dispatchResourceMapSelect = useStore(s => s.dispatchResourceMapSelect);
  const dispatchResourceMapToggle = useStore(s => s.dispatchResourceMapToggle);
  const resourceMap = useStore(s => s.asteroids.resourceMap);

  const [selected, setSelected] = useState();
  const [showAllAbundances, setShowAllAbundances] = useState();

  // if there is an active resource map, select that resource
  useEffect(() => {
    if (resourceMap.active && resourceMap.selected) {
      setSelected({ type: 'resource', id: resourceMap.selected });
    }
  }, []);

  // get lot abundance
  const lotAbundances = useMemo(() => {
    if (!(asteroid && lotId)) return [];

    // TODO: do this in worker? takes about 200ms on decent cpu
    const lotIndex = Lot.toIndex(lotId);
    const resourceAbundances = Asteroid.Entity.getAbundances(asteroid);
    return Object.keys(resourceAbundances || {})
      .reduce((acc, i) => {
        if (resourceAbundances[i] > 0) {
          acc.push({
            i,
            abundance: Asteroid.Entity.getAbundanceAtLot(asteroid, lotIndex, i)
          });
        }
        return acc;
      }, [])
      .sort((a, b) => b.abundance - a.abundance);
  }, [asteroid, lotId]);

  const onClickResource = useCallback((id) => () => {
    setSelected({ type: 'resource', id });

    dispatchResourceMapSelect(id);
    dispatchResourceMapToggle(true);
  }, []);

  const [showAbundances, abundancesTruncated] = useMemo(() => {
    if (showAllAbundances || lotAbundances.length < 8) {
      return [lotAbundances, false];
    } else {
      return [lotAbundances.slice(0, 5), true];
    }
  }, [lotAbundances, showAllAbundances]);

  const selectedResource = useMemo(() => {
    if (selected && selected.type === 'resource') {
      return Product.TYPES[selected.id];
    }
    return null;
  }, [selected]);

  const selectedSample = useMemo(() => {
    if (selected && selected.type === 'sample') {
      return (lot?.deposits || []).find((s) => selected.id === s.id);
    }
    return null;
  }, [lot?.deposits, selected]);

  const extraSampleParams = useMemo(() => {
    const params = {};
    if (!currentSamplingAction) {
      if (selectedSample?.id) {
        params.improveSample = { ...selectedSample };
        params._disabled = !(selectedSample?.Deposit?.status === Deposit.STATUSES.SAMPLED && selectedSample?.Deposit?.initialYield === selectedSample?.Deposit?.remainingYield);
      } else if (selectedResource?.i) {
        params.overrideResourceId = Number(selectedResource?.i);
      }
    }
    return params;
  }, [currentSamplingAction, selectedResource, selectedSample]);

  const extraExtractParams = useMemo(() => {
    const params = {};
    if (!currentExtraction) {
      if (selectedSample) {
        params.preselect = { depositId: selectedSample?.id };
        if (selectedSample.Deposit?.remainingYield === 0) {
          params._disabled = true;
        }
      }
    }
    return params;
  }, [currentExtraction, selectedSample]);

  const [ownedSamples, ownedSamplesDepleted, forSaleSamples, forSaleSamplesDepleted] = useMemo(() => ([
    (lot?.deposits || []).filter((s) => s.Control.controller.id === crew?.id && (!s.Deposit.initialYield || s.Deposit.remainingYield > 0)).sort(sampleSort),
    (lot?.deposits || []).filter((s) => s.Control.controller.id === crew?.id && s.Deposit.initialYield > 0 && s.Deposit.remainingYield === 0).sort(sampleSort),
    // TODO: price is the marker, not non-ownership
    (lot?.deposits || []).filter((s) => s.Control.controller.id !== crew?.id && (!s.Deposit.initialYield || s.Deposit.remainingYield > 0)).sort(sampleSort),
    (lot?.deposits || []).filter((s) => s.Control.controller.id !== crew?.id && s.Deposit.initialYield > 0 && s.Deposit.remainingYield === 0).sort(sampleSort),
  ]), [crew?.id, lot?.deposits]);

  return (
    <>
      <Scrollable hasTray={currentSamplingAction || selectedResource || selectedSample || currentExtraction}>
        <HudMenuCollapsibleSection titleText="Lot Resources" titleLabel="Abundance">
          
          {showAbundances.map(({ i, abundance }) => {
            const { name, category } = Product.TYPES[i];
            const categoryKey = keyify(category);
            const isSelected = selected?.type === 'resource' && Number(selected?.id) === Number(i);
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
          
        </HudMenuCollapsibleSection>

        <DepositSection
          title="My Deposits"
          deposits={ownedSamples}
          depleted={ownedSamplesDepleted}
          onSelect={setSelected}
          selected={selected} />

        <DepositSection
          title="For Sale"
          deposits={forSaleSamples}
          depleted={forSaleSamplesDepleted}
          onSelect={setSelected}
          selected={selected} />
      </Scrollable>

      {(currentSamplingAction || selectedResource || selectedSample || currentExtraction) && (
        <Tray>
          <>
            {(currentSamplingAction || selectedResource || selectedSample) && (
              <actionButtons.CoreSample.Component {...actionProps} {...extraSampleParams} />
            )}
            {/* TODO: list sample for sale */}
            {/* TODO: purchase sample for sale (if one is selected) */}
            {lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
              && lot?.building?.Extractors?.length > 0
              && (currentExtraction || selectedSample)
              && <actionButtons.Extract.Component {...actionProps} {...extraExtractParams} />
            }
          </>
        </Tray>
      )}
    </>
  );
};

export default LotResources;