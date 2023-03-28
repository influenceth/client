import { useMemo } from 'react';
// import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import { Scrollable, Tray } from './components';
import SearchFilterTray from '~/components/SearchFilterTray';
import SearchFilters from '~/components/SearchFilters';

const SearchMap = ({ assetType }) => {
  const assetSearch = useStore(s => s.assetSearch[assetType]);
  const isAssetSearchMatchingDefault = useStore(s => s.isAssetSearchMatchingDefault);
  const isDefaultSearch = useMemo(() => isAssetSearchMatchingDefault(assetType), [assetType, assetSearch]);
  return (
    <>
      <Scrollable hasTray={!isDefaultSearch}>
        <SearchFilters assetType={assetType} />
        <div style={{ height: 20 }} />
      </Scrollable>

      {!isDefaultSearch && (
        <Tray>
          <SearchFilterTray assetType={assetType} />
        </Tray>
      )}
    </>
  );
};

export default SearchMap;
