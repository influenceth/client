import { useMemo } from '~/lib/react-debug';
import styled from 'styled-components';
import { Asteroid } from '@influenceth/sdk';

import Button from '~/components/ButtonAlt';
import { CloseIcon, LotSearchIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';
import Banner from './Banner';
import { reactBool } from '~/lib/utils';

const { MAX_LOTS_RENDERED } = constants;

const ActiveFilters = styled.div`
  align-items: center;
  display: flex;
  & > svg {
    color: ${p => p.theme.colors.main};
    font-size: 28px;
    margin-right: 8px;
  }
`;

const formatResultsTally = (tally, maxResults) => {
  if (tally === undefined) return <>&nbsp;</>;
  if (tally > 2000 && tally !== maxResults) {
    return `${Math.floor(tally / 1e3)}k${tally === maxResults ? '' : '+'} Results`;
  }
  return `${(tally || 0).toLocaleString()} Results`;
}

const SearchLotsBanner = ({ visible }) => {
  const assetType = 'lotsMapped';
  const filters = useStore(s => s.assetSearch[assetType]?.filters);
  const highlight = useStore(s => s.assetSearch[assetType]?.highlight);
  const resetFilters = useStore(s => s.dispatchFiltersReset(assetType));
  const isAssetSearchFilterMatchingDefault = useStore(s => s.isAssetSearchFilterMatchingDefault);

  const { total, isLoading } = useStore(s => s.lotsMappedAssetSearchResults);
  const asteroidId = useStore(s => s.asteroids.origin);

  const maxResults = useMemo(import.meta.url, () => Asteroid.getSurfaceArea(asteroidId), [asteroidId]);

  const activeFilters = useMemo(import.meta.url, () => {
    return Object.keys(filters || {})
      .reduce((acc, fieldName) => acc + (isAssetSearchFilterMatchingDefault(assetType, fieldName) ? 0 : 1), 0)
  }, [assetType, filters]);

  return (
    <Banner
      headline={formatResultsTally(isLoading ? undefined : total, maxResults)}
      isLoading={reactBool(isLoading)}
      isVisible={visible}
      loadingMessage="Searching">
      <ActiveFilters style={{ fontSize: '90%' }}>
        <LotSearchIcon />
        {total > MAX_LOTS_RENDERED
          ? `Showing ${MAX_LOTS_RENDERED.toLocaleString()} Results`
          : (
            activeFilters > 0
              ? `${activeFilters} Lot Filter${activeFilters === 1 ? '' : 's'} Active`
              : (highlight ? `Custom Highlighting` : '')
          )
        }
      </ActiveFilters>
      <div>
        {(activeFilters > 0 || highlight) && (
          <Button size="small" width={110} onClick={resetFilters}>
            <CloseIcon style={{ marginRight: 6 }} /> Clear
          </Button>
        )}
      </div>
    </Banner>
  );
};

export default SearchLotsBanner;