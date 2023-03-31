import { useCallback, useMemo } from 'react';
import { SPECTRAL_TYPES, Capable, Crewmate, Inventory } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import AsteroidNameFilter from './filters/AsteroidNameFilter';
import RadiusFilter from './filters/RadiusFilter';
import AxisFilter from './filters/AxisFilter';
import InclinationFilter from './filters/InclinationFilter';
import EccentricityFilter from './filters/EccentricityFilter';
import OwnershipFilter from './filters/OwnershipFilter';
import CrewmateNameFilter from './filters/CrewmateNameFilter';
import CrewmateCrewFilter from './filters/CrewmateCrewFilter';
import YieldFilter from './filters/YieldFilter';
import BuildingTypeFilter from './filters/BuildingTypeFilter';
import CrewNameFilter from './filters/CrewNameFilter';
import CrewOwnershipFilter from './filters/CrewOwnershipFilter';
import LotIdFilter from './filters/LotIdFilter';
import LotOccupiedFilter from './filters/LotOccupiedFilter';
import LotLeaseFilter from './filters/LotLeaseFilter';  // TODO (TODAY)
import BooleanFilter from './filters/BooleanFilter';
import CheckboxFilter from './filters/CheckboxFilter';


const spectralTypeOptions = Object.keys(SPECTRAL_TYPES).reduce((acc, key) => ([
  ...acc,
  { key, label: `${SPECTRAL_TYPES[key]}-type`, initialValue: true }
]), []);

const spectralTypeColors = {
  0: '#6efaf4',
  1: '#00f3ff',
  2: '#00ebff',
  3: '#00e1ff',
  4: '#00d5ff',
  5: '#00c7ff',
  6: '#00b6ff',
  7: '#50a0ff',
  8: '#a084ff',
  9: '#d65dff',
  10: '#ff00f2'
};

const buildingTypeOptions = Object.keys(Capable.TYPES)
  .filter((k) => k > 0)
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Capable.TYPES[key].name, initialValue: true }
  ]), []);

const lotSearchBuildingTypeOptions = Object.keys(Capable.TYPES).reduce((acc, key) => ([
  ...acc,
  { key, label: Capable.TYPES[key].name, initialValue: true }
]), []);
lotSearchBuildingTypeOptions.push({ key: 10, label: 'Light Transport (landed)', initialValue: true });

const buildingTypeColors = {
  0: '#666666',
  1: '#ff8c00',
  2: '#e81123',
  3: '#ec008c',
  4: '#68217a',
  5: '#00188f',
  6: '#00bcf2',
  7: '#00b294',
  8: '#009e49',
  9: '#bad80a',
  10: '#fff100',
};


const resourceTypeOptions = Object.keys(Inventory.RESOURCES)
  .filter((k) => k <= 22)
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Inventory.RESOURCES[key].name, initialValue: true }
  ]), []);

const crewmateClassOptions = Object.keys(Crewmate.CLASSES).reduce((acc, key) => ([
  ...acc,
  { key, label: Crewmate.CLASSES[key].name, initialValue: true }
]), []);

const crewmateCollectionOptions = Object.keys(Crewmate.COLLECTIONS).reduce((acc, key) => ([
  ...acc,
  { key, label: Crewmate.COLLECTIONS[key].name, initialValue: true }
]), []);

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
        <CheckboxFilter
          {...filterProps}
          defaultColorMap={spectralTypeColors}
          fieldName="spectralType"
          highlightFieldName="spectralType"
          options={spectralTypeOptions}
          title="Spectral Type" />
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
        <CheckboxFilter
          {...filterProps}
          fieldName="type"
          options={buildingTypeOptions}
          title="Type" />
      </>
    );
  }
  if (assetType === 'coresamples') {
    return (
      <>
        <CheckboxFilter
          {...filterProps}
          fieldName="resource"
          options={resourceTypeOptions}
          title="Resource Type" />
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
        <CheckboxFilter
          {...filterProps}
          fieldName="class"
          options={crewmateClassOptions}
          title="Class" />
        <CheckboxFilter
          {...filterProps}
          fieldName="collection"
          options={crewmateCollectionOptions}
          title="Collection" />
      </>
    )
  }
  if (assetType === 'lotsMapped') {
    return (
      <>
        <LotIdFilter {...filterProps} />
        <CheckboxFilter
          {...filterProps}
          defaultColorMap={buildingTypeColors}
          fieldName="type"
          highlightFieldName="type"
          options={lotSearchBuildingTypeOptions}
          title="Buildings" />

        <LotOccupiedFilter {...filterProps} />
        <BooleanFilter
          {...filterProps}
          title="Crew"
          fieldName="hasCrew"
          label="Stationed Crew" />
        <BooleanFilter
          {...filterProps}
          title="Core Samples"
          fieldName="hasCoresForSale"
          label="Core Samples for Sale" />
      </>
    );
  }
  if (assetType === 'lots') {
    return (
      <>
        <BuildingTypeFilter {...filterProps} isLotSearch />
        <LotOccupiedFilter {...filterProps} />
      </>
    );
  }
  return null;
};

export default SearchFilters;