import { useCallback } from 'react';

import useStore from '~/hooks/useStore';
import AsteroidNameFilter from './filters/AsteroidNameFilter';
import RadiusFilter from './filters/RadiusFilter';
import SpectralTypeFilter from './filters/SpectralTypeFilter';
import AxisFilter from './filters/AxisFilter';
import InclinationFilter from './filters/InclinationFilter';
import EccentricityFilter from './filters/EccentricityFilter';
import OwnershipFilter from './filters/OwnershipFilter';
import CrewmateNameFilter from './filters/CrewmateNameFilter';
import CrewmateCrewFilter from './filters/CrewmateCrewFilter';
import CrewmateClassFilter from './filters/CrewmateClassFilter';
import CrewmateCollectionFilter from './filters/CrewmateCollectionFilter';

const SearchFilters = ({ assetType }) => {
  const filters = useStore(s => s.assetSearch[assetType].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated(assetType));

  const onFiltersChange = useCallback((update) => {
    updateFilters({ ...(filters || {}), ...update });
  }, [filters, updateFilters]);

  if (assetType === 'asteroids') {
    return (
      <>
        <OwnershipFilter filters={filters} onChange={onFiltersChange} />
        <RadiusFilter filters={filters} onChange={onFiltersChange} />
        <SpectralTypeFilter filters={filters} onChange={onFiltersChange} />
        <AxisFilter filters={filters} onChange={onFiltersChange} />  
        <InclinationFilter filters={filters} onChange={onFiltersChange} />
        <EccentricityFilter filters={filters} onChange={onFiltersChange} />
        <AsteroidNameFilter filters={filters} onChange={onFiltersChange} />
      </>
    );
  }
  if (assetType === 'crewmates') {
    return (
      <>
        <CrewmateNameFilter filters={filters} onChange={onFiltersChange} />
        <CrewmateCrewFilter filters={filters} onChange={onFiltersChange} />
        <CrewmateClassFilter filters={filters} onChange={onFiltersChange} />
        <CrewmateCollectionFilter filters={filters} onChange={onFiltersChange} />
      </>
    )
  }
  return null;
};

export default SearchFilters;