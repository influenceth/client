import { useCallback, useEffect, useMemo } from 'react';
import { Asteroid, Building, Crewmate, Product } from '@influenceth/sdk';

import useStore from '~/hooks/useStore';
import AsteroidNameFilter from './filters/AsteroidNameFilter';
import OwnershipFilter from './filters/OwnershipFilter';
import CrewOwnershipFilter from './filters/CrewOwnershipFilter';
import LotIdFilter from './filters/LotIdFilter';
import LotOccupiedFilter from './filters/LotOccupiedFilter';
import LotLeaseFilter from './filters/LotLeaseFilter';
import BooleanFilter from './filters/BooleanFilter';
import CheckboxFilter from './filters/CheckboxFilter';
import RangeFilter from './filters/RangeFilter';
import constants from '~/lib/constants';
import Ether from './Ether';
import formatters from '~/lib/formatters';
import TextFilter from './filters/TextFilter';
import usePriceConstants from '~/hooks/usePriceConstants';

// spectral type filter configs
const spectralTypeOptions = Object.keys(Asteroid.SPECTRAL_TYPES).reduce((acc, spectralId) => ([
  ...acc,
  { key: spectralId, label: `${Asteroid.getSpectralType(spectralId)}-type`, initialValue: true }
]), []);

const spectralTypeColors = {
  1: '#6efaf4',
  2: '#00f3ff',
  3: '#00ebff',
  4: '#00e1ff',
  5: '#00d5ff',
  6: '#00c7ff',
  7: '#00b6ff',
  8: '#50a0ff',
  9: '#a084ff',
  10: '#d65dff',
  11: '#ff00f2'
};

// building type filter configs
const buildingTypeOptions = Object.keys(Building.TYPES)
  .filter((k) => k > 0)
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Building.TYPES[key].name, initialValue: true }
  ]), []);

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

const lotSearchBuildingTypeOptions = Object.keys(Building.TYPES).reduce((acc, key) => ([
  ...acc,
  { key, label: Building.TYPES[key].name, initialValue: true }
]), []);
lotSearchBuildingTypeOptions.push({ key: 10, label: 'Light Transport (landed)', initialValue: true });

const constructionStatusOptions = Object.keys(Building.CONSTRUCTION_STATUSES)
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Building.CONSTRUCTION_STATUSES[key], initialValue: true }
  ]), [])
  .filter(({ key }) => key > 0);

const actionItemStatusOptions = [
  { key: 'pending', label: 'Processing', initialValue: true },
  { key: 'failed', label: 'Failed', initialValue: true },
  { key: 'ready', label: 'Ready', initialValue: true },
  { key: 'unready', label: 'Not Ready', initialValue: true },
  { key: 'plans', label: 'Planned', initialValue: true },
];

// resource type filter configs
const resourceTypeOptions = Object.keys(Product.TYPES)
  .filter((k) => Product.TYPES[k].type === 'Raw Material')
  .reduce((acc, key) => ([
    ...acc,
    { key, label: Product.TYPES[key].name, initialValue: true }
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
  labels: { min: 'Min (km)', max: 'Max (km)' },
  rangeLimits: { min: constants.MIN_ASTEROID_RADIUS / 1000, max: constants.MAX_ASTEROID_RADIUS / 1000 }
};

const axisConfig = {
  fieldNames: { min: 'axisMin', max: 'axisMax' },
  // fieldNote: formatters.period,
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

// TODO: there is probably a more performant and/or organized way to break these apart
//  (and to memoize any inputs possible)
const SearchFilters = ({ assetType, highlighting }) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const filters = useStore(s => s.assetSearch[assetType].filters);
  const updateFilters = useStore(s => s.dispatchFiltersUpdated(assetType));
  const { data: priceConstants } = usePriceConstants();
  const radiusFieldNote = useCallback((value) => {
    return priceConstants && <Ether>{formatters.asteroidPrice(value, priceConstants)}</Ether>
  }, [priceConstants]);

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

  useEffect(() => {
    // for most types, default filter to asteroid if one is selected
    if (['buildings','coresamples','leases','lots'].includes(assetType)) {
      onFiltersChange({ asteroid: asteroidId });
    }
    else if (['actionitems'].includes(assetType)) {
      onFiltersChange({ asteroid: zoomStatus === 'in' ? asteroidId : undefined });
    }
  }, [asteroidId, assetType, zoomStatus]);


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
        <TextFilter
          {...filterProps}
          fieldName="asteroid"
          isId
          placeholder="Filter by Asteroid Id..."
          title="Asteroid" />

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
        <TextFilter
          {...filterProps}
          fieldName="asteroid"
          isId
          placeholder="Filter by Asteroid Id..."
          title="Asteroid" />

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

        <TextFilter
          {...filterProps}
          fieldName="name"
          title="Name" />
      </>
    )
  }
  if (assetType === 'crewmates') {
    return (
      <>
        <TextFilter
          {...filterProps}
          fieldName="name"
          title="Name" />

        <TextFilter
          {...filterProps}
          fieldName="crew"
          isId
          placeholder="Filter by Crew Id..."
          title="Crew" />

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

        <LotLeaseFilter {...filterProps} />

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
        <TextFilter
          {...filterProps}
          fieldName="asteroid"
          isId
          placeholder="Filter by Asteroid Id..."
          title="Asteroid" />

        <TextFilter
          {...filterProps}
          fieldName="controller"
          isId
          placeholder="Filter by Controlling Crew Id..."
          title="Controller" />

        <TextFilter
          {...filterProps}
          fieldName="occupier"
          isId
          placeholder="Filter by Occupying Crew Id..."
          title="Occupier" />

        <CheckboxFilter
          {...filterProps}
          fieldName="building"
          options={lotSearchBuildingTypeOptions}
          title="Buildings" />

        <CheckboxFilter
          {...filterProps}
          fieldName="construction"
          options={constructionStatusOptions}
          title="Construction Status" />
      </>
    );
  }
  if (assetType === 'actionitems') {
    return (
      <>
        <TextFilter
          {...filterProps}
          fieldName="asteroid"
          isId
          placeholder="Filter by Asteroid Id..."
          title="Asteroid" />

        <CheckboxFilter
          {...filterProps}
          fieldName="status"
          options={actionItemStatusOptions}
          title="Status" />
      </>
    )
  }
  return null;
};

export default SearchFilters;