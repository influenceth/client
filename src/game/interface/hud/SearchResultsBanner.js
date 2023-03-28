import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import Dropdown from '~/components/DropdownV2';
import InProgressIcon from '~/components/InProgressIcon';
import useAssetSearch from '~/hooks/useAssetSearch';
import useStore, { assetSearchDefaults } from '~/hooks/useStore';
import theme from '~/theme';
import useAsteroidColumns from '../details/listViews/asteroids';
import { background } from './HudMenu';

const cornerSize = 15;

const Wrapper = styled.div`
  position: fixed;
  top: 0;
  width: 560px;
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


const SearchBannerAsteroids = ({ data, isLoading }) => {
  const assetType = 'asteroidsMapped';
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
      .filter((c) => c.sortField)
      .map((c) => ({ label: c.label, value: c.sortField, icon: c.icon }));
  }, [columns]);

  if (isLoading || !data) return null;
  return (
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
  );
};

const SearchBannerLots = ({ data, isLoading }) => {
  return (
    <>
      Lots
    </>
  );
};

const SearchResultsBanner = ({ assetType }) => {
  const { data: assetSearch, isLoading } = useAssetSearch(assetType);
  const asteroidId = useStore(s => s.asteroids.origin);

  const data = useMemo(() => {
    const total = assetSearch?.total;
    const showing = assetSearch?.hits?.length || 0;
    return { total, showing };
  }, [assetSearch]);

  const formattedTotal = useMemo(() => {
    if (isLoading) return <>&nbsp;</>;
    const maxResults = assetType === 'lotsMapped' ? Asteroid.getSurfaceArea(asteroidId) : 250000;
    if (data?.total > 2000 && data?.total !== maxResults) {
      return `${Math.floor(data?.total / 1e3)}k${data?.total === maxResults ? '' : '+'} Results`;
    }
    return `${(data?.total || 0).toLocaleString()} Results`;
  }, [assetType, asteroidId, data, isLoading]);

  return (
    <Wrapper visible={!!data}>
      <TotalHits>{formattedTotal}</TotalHits>
      <Container loading={isLoading}>
        <InnerContainer>
          {isLoading && (
            <Loading>
              <InProgressIcon height={14} />
              <label>Searching</label>
            </Loading>
          )}
          {assetType === 'asteroidsMapped' && <SearchBannerAsteroids data={data} isLoading={isLoading} />}
          {assetType === 'lotsMapped' && <SearchBannerLots data={data} isLoading={isLoading} />}
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
      if (openHudMenu === 'asteroid.Lot Search' || !isAssetSearchMatchingDefault('lotsMapped')) {
         return 'lotsMapped';
      }
    } else if (zoomStatus === 'out') {
      if (openHudMenu === 'belt.System Search' || !isAssetSearchMatchingDefault('asteroidsMapped')) {
        return 'asteroidsMapped';
      }
    }
  }, [assetSearch, openHudMenu, zoomStatus, zoomToLot]);

  if (!assetType) return null;
  return <SearchResultsBanner assetType={assetType} />;
};

export default SearchResultsBannerWrapper;