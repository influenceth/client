import { useCallback, useMemo } from 'react';
import { SPECTRAL_TYPES, Capable, Crewmate, Inventory } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import AsteroidNameFilter from './filters/AsteroidNameFilter';
import OwnershipFilter from './filters/OwnershipFilter';
import CrewmateNameFilter from './filters/CrewmateNameFilter';
import CrewmateCrewFilter from './filters/CrewmateCrewFilter';
import BuildingTypeFilter from './filters/BuildingTypeFilter';
import CrewNameFilter from './filters/CrewNameFilter';
import CrewOwnershipFilter from './filters/CrewOwnershipFilter';
import LotIdFilter from './filters/LotIdFilter';
import LotOccupiedFilter from './filters/LotOccupiedFilter';
import LotLeaseFilter from './filters/LotLeaseFilter';  // TODO (TODAY)
import BooleanFilter from './filters/BooleanFilter';
import CheckboxFilter from './filters/CheckboxFilter';
import RangeFilter from './filters/RangeFilter';
import constants from '~/lib/constants';
import Ether from './Ether';
import formatters from '~/lib/formatters';
import useSale from '~/hooks/useSale';

// spectral type filter configs
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

// building type filter configs
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

// resource type filter configs
const resourceTypeOptions = Object.keys(Inventory.RESOURCES)
  .filter((k) => k <= 22)
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Inventory.RESOURCES[key].name, initialValue: true }
  ]), []);

// crewmate class filter configs
const crewmateClassOptions = Object.keys(Crewmate.CLASSES).reduce((acc, key) => ([
  ...acc,
  { key, label: Crewmate.CLASSES[key].name, initialValue: true }
]), []);

// crewmate collection filter configs
const crewmateCollectionOptions = Object.keys(Crewmate.COLLECTIONS).reduce((acc, key) => ([
  ...acc,
  { key, label: Crewmate.COLLECTIONS[key].name, initialValue: true }
]), []);

const radiusConfig = {
  fieldNames: { min: 'radiusMin', max: 'radiusMax' },
  labels: { min: 'Min (m)', max: 'Max (m)' },
  rangeLimits: { min: constants.MIN_ASTEROID_RADIUS, max: constants.MAX_ASTEROID_RADIUS }
};

const axisConfig = {
  fieldNames: { min: 'axisMin', max: 'axisMax' },
  fieldNote: formatters.period,
  labels: { min: 'Min (AU)', max: 'Max (AU)' },
  rangeLimits: { min: constants.MIN_AXIS, max: constants.MAX_AXIS }
};

const inclinationConfig = {
  fieldNames: { min: 'incMin', max: 'incMax' },
  labels: { min: 'Min (Deg)', max: 'Max (Deg)' },
  rangeLimits: { min: constants.MIN_INCLINATION, max: constants.MAX_INCLINATION },
  displayFormatter: (r) => r > 0 ? Math.round(100 * 180 * r / Math.PI) / 100 : '',
  searchFormatter: (d) => d >= 0 ? Math.PI * d / 180 : undefined
};

const eccConfig = {
  fieldNames: { min: 'eccMin', max: 'eccMax' },
  rangeLimits: { min: constants.MIN_ECCENTRICITY, max: constants.MAX_ECCENTRICITY }
};

const yieldConfig = {
  fieldNames: { min: 'yieldMin', max: 'yieldMax' },
  labels: { min: 'Min (tonnes)', max: 'Max (tonnes)' },
  rangeLimits: { min: 0, max: 10000 }
};



// TODO: there is probably a more performant way to break these apart
//  (and to memoize any inputs possible)
const SearchFilters = ({ assetType, highlighting }) => {
  const { data: sale } = useSale();
  const filters = useStore(s => s.assetSearch[assetType].filters);
  const highlight = useStore(s => s.assetSearch[assetType].highlight);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated(assetType));
  
  const radiusFieldNote = useCallback((value) => sale ? <Ether>{formatters.asteroidPrice(value, sale)}</Ether> : null, [sale])

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

        <RangeFilter
          {...filterProps}
          {...radiusConfig}
          fieldNote={radiusFieldNote}
          highlightFieldName="radius"
          title="Radius" />

        <CheckboxFilter
          {...filterProps}
          defaultColorMap={spectralTypeColors}
          fieldName="spectralType"
          highlightFieldName="spectralType"
          options={spectralTypeOptions}
          title="Spectral Type" />

        <RangeFilter
          {...filterProps}
          {...axisConfig}
          highlightFieldName="axis"
          step={0.1}
          title="Semi-major Axis" />

        <RangeFilter
          {...filterProps}
          {...inclinationConfig}
          highlightFieldName="inclination"
          step={0.01}
          title="Orbit Inclination"
          {...inclinationConfig} />

        <RangeFilter
          {...filterProps}
          {...eccConfig}
          highlightFieldName="eccentricity"
          step={0.001}
          title="Orbit Eccentricity" />

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
        
        <RangeFilter
          {...filterProps}
          {...yieldConfig}
          title="Yield" />
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