import { useMemo } from 'react';

import useStore from '~/hooks/useStore';
import { Scrollable, Tray } from './components';
import SearchFilterTray from '~/components/SearchFilterTray';
import SearchFilters from '~/components/SearchFilters';


const SearchAsteroids = ({ hideTray }) => {
  const filters = useStore(s => s.assetSearch.asteroids.filters);

  const activeFilters = useMemo(() => Object.values(filters).filter((v) => v !== undefined).length, [filters]);
  const hasTray = !hideTray && activeFilters > 0;  
  return (
    <>
      <Scrollable hasTray={hasTray}>
        <SearchFilters assetType="asteroids" />
        <div style={{ height: 20 }} />
      </Scrollable>

      {hasTray && (
        <Tray>
          <SearchFilterTray assetType="asteroids" />
        </Tray>
      )}
    </>
  );
};

export default SearchAsteroids;