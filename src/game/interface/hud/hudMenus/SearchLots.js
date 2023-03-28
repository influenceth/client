import { useMemo } from 'react';
// import styled from 'styled-components';

import useStore from '~/hooks/useStore';
import { Scrollable, Tray } from './components';
import SearchFilterTray from '~/components/SearchFilterTray';
import SearchFilters from '~/components/SearchFilters';


const SearchLots = ({ hideTray }) => {
  const filters = useStore(s => s.assetSearch.plots.mapFilters);
  const updateFilters = useStore(s => s.dispatchMapFiltersUpdated('plots'));

// TODO: include by id:
  /*
    const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);

    const handleLotJumper = useCallback((e) => {
      if (e.key === 'Enter' && e.currentTarget.value) {
        dispatchPlotSelected(asteroid?.i, parseInt(e.currentTarget.value));
      }
    }, [asteroid?.i]);

    const plotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);
    
    <label>Jump to Lot #</label>
    <NumberInput
      initialValue={null}
      max={plotTally}
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
          assetType="plots"
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
