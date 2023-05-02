import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import Dropdown from '~/components/DropdownV2';
import InProgressIcon from '~/components/InProgressIcon';
import useAssetSearch from '~/hooks/useAssetSearch';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import useAsteroidColumns from '../details/listViews/asteroids';
import { background } from './HudMenu';
import { CloseIcon, LotSearchIcon } from '~/components/Icons';
import Button from '~/components/ButtonAlt';

const cornerSize = 15;

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: ${p => p.assetType === 'lotsMapped' ? 480 : 560}px;
  transform: ${p => p.visible ? 'translateY(20px)' : 'translateY(-80px)'};
  transition: transform 250ms ease;
  & > * {
    white-space: nowrap;
  }
`;

const TotalHits = styled.div`
  color: ${p => p.theme.colors.main};
  margin-bottom: 2px;
  font-size: 110%;
  text-align: center;
  text-transform: uppercase;
`;

const Container = styled.div`
  background: transparent;
  border: 1px solid ${p => p.theme.colors.main};
  clip-path: polygon(
    0% 0%,
    100% 0%,
    100% calc(100% - ${cornerSize}px),
    calc(100% - ${cornerSize}px) 100%,
    ${cornerSize}px 100%,
    0% calc(100% - ${cornerSize}px)
  );
  padding: 3px;
  pointer-events: all;
  position: relative;

  margin: 0 auto;
  width: ${p => p.loading ? '320px' : '100%'};
  transition: width 250ms ease;
`;

const InnerContainer = styled(Container)`
  align-items: center;
  background: ${background};
  border: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: 45px;
  padding: 0 12px;
  overflow: hidden;
`;

const Loading = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex: 1;
  & > label {
    flex: 1;
    font-size: 115%;
    margin-right: 42px;
    text-align: center;
    text-transform: uppercase;
  }
`;
const Showing = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex: 1;
  &:before {
    background: ${p => p.theme.colors.main};
    content: '';
    display: inline-block;
    height: 8px;
    margin-right: 8px;
    transform: rotate(45deg);
    transform-origin: center center;
    width: 8px;
  }

  & > * {
    white-space: nowrap;
  }
`;
const SortDirection = styled.div`
  cursor: ${p => p.theme.cursors.active};
  font-size: 90%;
  opacity: 0.5;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
  text-align: center;
  width: 80px;
`;
const SortSelection = styled.div`
  display: flex;
  flex: 1;
  justify-content: flex-end;
  opacity: 0.6;
  transition: opacity 250ms ease;
  &:hover {
    opacity: 1;
  }
`;

const ActiveFilters = styled.div`
  align-items: center;
  display: flex;
  & > svg {
    color: ${p => p.theme.colors.main};
    font-size: 28px;
    margin-right: 8px;
  }
`;

const ResultsTally = ({ tally, maxResults }) => {
  const formattedTotal = useMemo(() => {
    if (tally === undefined) return <>&nbsp;</>;
    if (tally > 2000 && tally !== maxResults) {
      return `${Math.floor(tally / 1e3)}k${tally === maxResults ? '' : '+'} Results`;
    }
    return `${(tally || 0).toLocaleString()} Results`;
  }, [tally, maxResults]);
  return <TotalHits>{formattedTotal}</TotalHits>
}

const SearchBannerAsteroids = ({ visible }) => {
  const assetType = 'asteroidsMapped';
  const { data: assetSearch, isLoading } = useAssetSearch(assetType);

  const columns = useAsteroidColumns();
  const sort = useStore(s => s.assetSearch[assetType].sort);
  const updateSort = useStore(s => s.dispatchSortUpdated(assetType));

  const toggleSortOrder = useCallback(() => {
    updateSort([sort[0], sort[1] === 'asc' ? 'desc' : 'asc']);
  }, [sort]);

  const updateSortOrder = useCallback((option) => {
    updateSort([option.value || 'r', 'desc']);
  }, [sort]);

  const sortOptions = useMemo(() => {
    return columns
      .filter((c) => c.sortField && !['owner','spectralType'].includes(c.sortField))
      .map((c) => ({ label: c.label, value: c.sortField, icon: c.icon }));
  }, [columns]);

  const data = useMemo(() => {
    const total = assetSearch?.total;
    const showing = assetSearch?.hits?.length || 0;
    return { total, showing };
  }, [assetSearch]);

  return (
    <Wrapper assetType={assetType} visible={visible && !!data}>
      <ResultsTally tally={isLoading ? undefined : data?.total} maxResults={250000} />
      <Container loading={isLoading}>
        <InnerContainer>
          {isLoading && (
            <Loading>
              <InProgressIcon height={14} />
              <label>Searching</label>
            </Loading>
          )}
          {!isLoading && (
            <>
              <Showing>
                Showing: {data.showing > 0 ? `1 - ${data.showing.toLocaleString()}` : 'n/a'}
              </Showing>
              <SortDirection onClick={toggleSortOrder}>
                {sort[1] === 'asc' ? 'Low > High' : 'High > Low'}
              </SortDirection>
              <SortSelection>
                <Dropdown
                  initialSelection={sort[0]}
                  background="transparent"
                  onChange={updateSortOrder}
                  options={sortOptions}
                  size="small"
                  style={{ textTransform: 'none' }}
                  width={180} />
              </SortSelection>
            </>
          )}
        </InnerContainer>
        <ClipCorner dimension={cornerSize} color={theme.colors.main} />
        <ClipCorner dimension={cornerSize} color={theme.colors.main} flip />
      </Container>
    </Wrapper>
  );
};

const SearchBannerLots = ({ visible }) => {
  const assetType = 'lotsMapped';
  const filters = useStore(s => s.assetSearch[assetType]?.filters);
  const highlight = useStore(s => s.assetSearch[assetType]?.highlight);
  const resetFilters = useStore(s => s.dispatchFiltersReset(assetType));
  const isAssetSearchFilterMatchingDefault = useStore(s => s.isAssetSearchFilterMatchingDefault);

  const { total, isLoading } = useStore(s => s.lotsMappedAssetSearchResults);
  const asteroidId = useStore(s => s.asteroids.origin);

  const maxResults = useMemo(() => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);

  const activeFilters = useMemo(() => {
    return Object.keys(filters || {})
      .reduce((acc, fieldName) => acc + (isAssetSearchFilterMatchingDefault(assetType, fieldName) ? 0 : 1), 0)
  }, [assetType, filters]);

  return (
    <Wrapper assetType={assetType} visible={visible}>
      <ResultsTally tally={isLoading ? undefined : total} maxResults={maxResults} />
      <Container loading={isLoading}>
        <InnerContainer>
          {isLoading && (
            <Loading>
              <InProgressIcon height={14} />
              <label>Searching</label>
            </Loading>
          )}
          {!isLoading && (
            <>
              <ActiveFilters style={{ fontSize: '90%' }}>
                <LotSearchIcon />
                {total > Asteroid.MAX_LOTS_RENDERED
                  ? `Showing ${Asteroid.MAX_LOTS_RENDERED.toLocaleString()} Results`
                  : (
                    activeFilters > 0
                      ? `${activeFilters} Lot Filter${activeFilters === 1 ? '' : 's'} Active`
                      : (highlight ? `Custom Highlighting` : '')
                  )
                }
              </ActiveFilters>
              <div>
                {(activeFilters > 0 || highlight) && (
                  <Button size="small" width={110} subtle onClick={resetFilters}>
                    <CloseIcon style={{ marginRight: 6 }} /> Clear
                  </Button>
                )}
              </div>
            </>
          )}
        </InnerContainer>
        <ClipCorner dimension={cornerSize} color={theme.colors.main} />
        <ClipCorner dimension={cornerSize} color={theme.colors.main} flip />
      </Container>
    </Wrapper>
  );
};

const SearchResultsBannerWrapper = () => {
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const zoomToLot = useStore(s => s.asteroids.zoomToLot);
  const assetSearch = useStore(s => s.assetSearch);
  const openHudMenu = useStore(s => s.openHudMenu);
  const isAssetSearchMatchingDefault = useStore(s => s.isAssetSearchMatchingDefault);
  
  let assetType = useMemo(() => {
    if (zoomStatus === 'in' && !zoomToLot) {
      return 'lotsMapped';
    } else if (zoomStatus === 'out') {
      return 'asteroidsMapped';
    }
  }, [zoomStatus, zoomToLot]);

  const visible = useMemo(() => {
    console.log('openHudMenu', openHudMenu)
    if (assetType === 'lotsMapped') {
      return (openHudMenu === 'ASTEROID_MAP_SEARCH' || !isAssetSearchMatchingDefault('lotsMapped'));
    } else if (assetType === 'asteroidsMapped') {
      return (openHudMenu === 'BELT_MAP_SEARCH' || !isAssetSearchMatchingDefault('asteroidsMapped'));
    }
  }, [assetType, assetSearch, openHudMenu]);

  if (assetType === 'asteroidsMapped') return <SearchBannerAsteroids visible={visible} />;
  if (assetType === 'lotsMapped') return <SearchBannerLots visible={visible} />;
  return null;
};

export default SearchResultsBannerWrapper;