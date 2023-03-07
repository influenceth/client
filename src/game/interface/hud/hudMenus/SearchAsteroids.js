import { useCallback, useEffect, useMemo } from 'react';

import { Scrollable } from './components';

import NameFilter from './filters/NameFilter';
import RadiusFilter from './filters/RadiusFilter';
import SpectralTypeFilter from './filters/SpectralTypeFilter';
import AxisFilter from './filters/AxisFilter';
import InclinationFilter from './filters/InclinationFilter';
import EccentricityFilter from './filters/EccentricityFilter';
import OwnershipFilter from './filters/OwnershipFilter';
import useStore from '~/hooks/useStore';

const SearchAsteroids = () => {
  const filters = useStore(s => s.asteroids.filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated);

  const onFiltersChange = useCallback((update) => {
    updateFilters({ ...(filters || {}), ...update });
  }, [filters, updateFilters]);

  return (
    <Scrollable>
      <OwnershipFilter filters={filters} onChange={onFiltersChange} />
      <RadiusFilter filters={filters} onChange={onFiltersChange} />
      <SpectralTypeFilter filters={filters} onChange={onFiltersChange} />
      <AxisFilter filters={filters} onChange={onFiltersChange} />  
      <InclinationFilter filters={filters} onChange={onFiltersChange} />
      <EccentricityFilter filters={filters} onChange={onFiltersChange} />
      <NameFilter filters={filters} onChange={onFiltersChange} />
      <div style={{ height: 20 }} />
    </Scrollable>
  );
};

export default SearchAsteroids;