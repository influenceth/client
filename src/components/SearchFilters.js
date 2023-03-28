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

const SearchFilters = ({ assetType, highlighting }) => {
  const filters = useStore(s => s.assetSearch[assetType].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated(assetType));

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
    assetType,
    filters,
    onChange: onFiltersChange,
  }), [assetType, filters, highlighting, onFiltersChange]);


  if (assetType === 'asteroids' || assetType === 'asteroidsMapped') {
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
  if (assetType === 'lotsMapped') {
    <>
    {/* TODO: 
      <LotOccupiedFilter {...filterProps} />
      <BuildingTypeFilter {...filterProps} />
      <LotForLeaseFilter {...filterProps} />
      <LotHasSamplesFilter {...filterProps} />
      <LotHasCrewFilter {...filterProps} />
      <LotIdFilter {...filterProps} />
      */}
    </>
  }
  if (assetType === 'lots') {

  }
  return null;
};

export default SearchFilters;