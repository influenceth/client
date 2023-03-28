import { useCallback, useMemo } from 'react';

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
import YieldFilter from './filters/YieldFilter';
import ResourceTypeFilter from './filters/ResourceTypeFilter';
import BuildingTypeFilter from './filters/BuildingTypeFilter';
import CrewNameFilter from './filters/CrewNameFilter';
import CrewOwnershipFilter from './filters/CrewOwnershipFilter';

const SearchFilters = ({ assetType, filters, highlighting, updateFilters }) => {
  const onFiltersChange = useCallback((update) => {
    const newFilters = {...(filters || {})};
    Object.keys(update).forEach((k) => {
      if (update[k] === undefined) {
        delete newFilters[k];
      } else {
        newFilters[k] = update[k];
      }
    });
    updateFilters(newFilters);
  }, [filters, updateFilters]);

  const filterProps = useMemo(() => ({
    filters,
    onChange: onFiltersChange,
    showHighlighting: highlighting,
  }), [filters, highlighting, onFiltersChange]);

  if (assetType === 'asteroids') {
    return (
      <>
        <OwnershipFilter {...filterProps} />
        <RadiusFilter {...filterProps} />
        <SpectralTypeFilter {...filterProps} />
        <AxisFilter {...filterProps} />  
        <InclinationFilter {...filterProps} />
        <EccentricityFilter {...filterProps} />
        <AsteroidNameFilter {...filterProps} />
      </>
    );
  }
  if (assetType === 'buildings') {
    return (
      <>
        <BuildingTypeFilter {...filterProps} />
      </>
    );
  }
  if (assetType === 'coresamples') {
    return (
      <>
        <ResourceTypeFilter {...filterProps} />
        <YieldFilter {...filterProps} />
      </>
    );
  }
  if (assetType === 'crews') {
    return (
      <>
        <CrewOwnershipFilter {...filterProps} />
        <CrewNameFilter {...filterProps} />
      </>
    )
  }
  if (assetType === 'crewmates') {
    return (
      <>
        <CrewmateNameFilter {...filterProps} />
        <CrewmateCrewFilter {...filterProps} />
        <CrewmateClassFilter {...filterProps} />
        <CrewmateCollectionFilter {...filterProps} />
      </>
    )
  }
  return null;
};

export default SearchFilters;