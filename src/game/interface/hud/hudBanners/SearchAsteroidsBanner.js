import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import Dropdown from '~/components/Dropdown';
import useAssetSearch from '~/hooks/useAssetSearch';
import useStore from '~/hooks/useStore';
import useAsteroidColumns from '~/game/interface/details/listViews/asteroids';
import Banner from './Banner';
import { boolAttr } from '~/lib/utils';

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

const formatResultsTally = (tally, maxResults) => {
  if (tally === undefined) return <>&nbsp;</>;
  if (tally > 2000 && tally !== maxResults) {
    return `${Math.floor(tally / 1e3)}k${tally === maxResults ? '' : '+'} Results`;
  }
  return `${(tally || 0).toLocaleString()} Results`;
}

const SearchAsteroidsBanner = ({ visible }) => {
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
      .filter((c) => c.sortField && !['owner','spectralType'].includes(c.sortField))  // TODO: ecs refactor
      .map((c) => ({ label: c.label, value: c.sortField, icon: c.icon }));
  }, [columns]);

  const data = useMemo(() => {
    const total = assetSearch?.total;
    const showing = assetSearch?.hits?.length || 0;
    return { total, showing };
  }, [assetSearch]);

  return (
    <Banner
      headline={formatResultsTally(isLoading ? undefined : data?.total, 250000)}
      isLoading={boolAttr(isLoading)}
      isVisible={boolAttr(visible && !!data)}
      loadingMessage="Searching"
      wide>
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
    </Banner>
  );
};

export default SearchAsteroidsBanner;