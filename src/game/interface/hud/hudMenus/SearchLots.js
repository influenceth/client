import { useMemo } from 'react';
// import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import { Scrollable, Tray } from './components';
import SearchFilterTray from '~/components/SearchFilterTray';
import SearchFilters from '~/components/SearchFilters';


const SearchLots = ({ hideTray }) => {
  const filters = useStore(s => s.assetSearch.lots.mapFilters);
  const updateFilters = useStore(s => s.dispatchMapFiltersUpdated('lots'));

// TODO: include by id:
  /*
    const dispatchLotSelected = useStore(s => s.dispatchLotSelected);

    const handleLotJumper = useCallback((e) => {
      if (e.key === 'Enter' && e.currentTarget.value) {
        dispatchLotSelected(asteroid?.i, parseInt(e.currentTarget.value));
      }
    }, [asteroid?.i]);

    const lotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);
    
    <label>Jump to Lot #</label>
    <NumberInput
      initialValue={null}
      max={lotTally}
      min={1}
      step={1}
      onBlur={(e) => e.currentTarget.value = undefined}
      onKeyDown={handleLotJumper} />
  */

  const activeFilters = useMemo(() => Object.values(filters).filter((v) => v !== undefined).length, [filters]);
  const hasTray = !hideTray && activeFilters > 0;  
  return (
    <>
      <Scrollable hasTray={hasTray}>
        <SearchFilters
          assetType="lots"
          filters={filters}
          highlighting
          updateFilters={updateFilters} />
        <div style={{ height: 20 }} />
      </Scrollable>

      {hasTray && (
        <Tray>
          <SearchFilterTray
            filters={filters}
            updateFilters={updateFilters} />
        </Tray>
      )}
    </>
  );
};

export default SearchLots;
