import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import Button from '~/components/ButtonAlt';
import { CloseIcon, FilterIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import { Scrollable, Tray } from './components';
import NameFilter from './filters/NameFilter';
import RadiusFilter from './filters/RadiusFilter';
import SpectralTypeFilter from './filters/SpectralTypeFilter';
import AxisFilter from './filters/AxisFilter';
import InclinationFilter from './filters/InclinationFilter';
import EccentricityFilter from './filters/EccentricityFilter';
import OwnershipFilter from './filters/OwnershipFilter';

const FilterTally = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  flex-direction: row;
  font-size: 90%;
  margin-left: 12px;
  & > svg {
    font-size: 135%;
    margin-right: 2px;
  }
`;

const SearchAsteroids = ({ alwaysTray }) => {
  const filters = useStore(s => s.asteroids.filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated);

  const onFiltersChange = useCallback((update) => {
    updateFilters({ ...(filters || {}), ...update });
  }, [filters, updateFilters]);

  const onClear = useCallback(() => {
    updateFilters({});
  }, []);

  const activeFilters = useMemo(() => Object.values(filters).filter((v) => v !== undefined).length, [filters]);
  const hasTray = alwaysTray || activeFilters > 0;
  return (
    <>
      <Scrollable hasTray={hasTray}>
        <OwnershipFilter filters={filters} onChange={onFiltersChange} />
        <RadiusFilter filters={filters} onChange={onFiltersChange} />
        <SpectralTypeFilter filters={filters} onChange={onFiltersChange} />
        <AxisFilter filters={filters} onChange={onFiltersChange} />  
        <InclinationFilter filters={filters} onChange={onFiltersChange} />
        <EccentricityFilter filters={filters} onChange={onFiltersChange} />
        <NameFilter filters={filters} onChange={onFiltersChange} />
        <div style={{ height: 20 }} />
      </Scrollable>

      {hasTray && (
        <Tray>
          {activeFilters > 0 && (
            <>
              <Button onClick={onClear} size="small" background="transparent" color={theme.colors.main}>
                <CloseIcon /> Clear
              </Button>
              <FilterTally>
                <FilterIcon />
                {activeFilters} Active Filter{activeFilters === 1 ? '' : 's'}
              </FilterTally>
            </>
          )}
        </Tray>
      )}
    </>
  );
};

export default SearchAsteroids;