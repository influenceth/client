import { useEffect } from 'react';
import { useThrottle } from '@react-hook/throttle';
import { useQuery } from 'react-query';
import { Entity } from '@influenceth/sdk';
import esb from 'elastic-builder';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';
import constants from '~/lib/constants';

const filtersToQuery = {};

filtersToQuery.asteroids = (filters) => {
  const queryBuilder = esb.boolQuery();
  if (filters.ownedBy) {
    if (filters.ownedBy === 'unowned') {
      queryBuilder.mustNot(esb.existsQuery('Nft.owner'))
    } else if (filters.ownedBy === 'owned') {
      queryBuilder.filter(esb.existsQuery('Nft.owner'))
    } else if (filters.ownedBy) {
      queryBuilder.filter(esb.termQuery('Nft.owner', filters.ownedBy));
    }
  }

  if (filters.controlledBy) {
    if (filters.controlledBy === 'uncontrolled') {
      queryBuilder.mustNot(esb.existsQuery('Control.controller.id'))
    } else if (filters.controlledBy === 'controlled') {
      queryBuilder.filter(esb.existsQuery('Control.controller.id'))
    } else if (filters.controlledBy) {
      queryBuilder.filter(esb.termQuery('Control.controller.id', filters.controlledBy));
    }
  }

  if (filters.radiusMin || filters.radiusMax) {
    const radiusRange = esb.rangeQuery('Celestial.radius');
    if (filters.radiusMin) radiusRange.gte(filters.radiusMin);
    if (filters.radiusMax) radiusRange.lte(filters.radiusMax);
    queryBuilder.filter(radiusRange);
  }

  if (filters.spectralType) {
    queryBuilder.filter(esb.termsQuery('Celestial.celestialType', filters.spectralType.map((t) => parseInt(t))));
  }

  if (filters.axisMin || filters.axisMax) {
    const axisRange = esb.rangeQuery('Orbit.a');
    if (filters.axisMin) axisRange.gte(filters.axisMin * constants.AU / 1000);
    if (filters.axisMax) axisRange.lte(filters.axisMax * constants.AU / 1000);
    queryBuilder.filter(axisRange);
  }

  if (filters.eccMin || filters.eccMax) {
    const eccRange = esb.rangeQuery('Orbit.ecc');
    if (filters.eccMin) eccRange.gte(filters.eccMin);
    if (filters.eccMax) eccRange.lte(filters.eccMax);
    queryBuilder.filter(eccRange);
  }

  if (filters.incMin || filters.incMax) {
    const incRange = esb.rangeQuery('Orbit.inc');
    if (filters.incMin) incRange.gte(filters.incMin);
    if (filters.incMax) incRange.lte(filters.incMax);
    queryBuilder.filter(incRange);
  }

  if (filters.name) {
    queryBuilder.should(esb.matchQuery(['Name.name'], filters.name));

    if (filters.name.match(/^[0-9]+$/)) {
      queryBuilder.should(esb.termQuery('id', Number(filters.name)));
    }
  }

  return queryBuilder;
};

filtersToQuery.buildings = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.asteroid) {
    queryBuilder.filter(esb.termQuery('meta.location.label', Entity.IDS.ASTEROID));
    queryBuilder.filter(esb.termQuery('meta.location.id', filters.asteroid));
  }

  if (filters.type) {
    queryBuilder.filter(esb.termsQuery('Building.buildingType', filters.type.map((t) => parseInt(t))));
  }

  if (filters.controller) {
    queryBuilder.filter(esb.termQuery('Control.controller.id', filters.controller));
  }

  // TODO: ecs refactor
  // if (filters.occupier) {
  //   queryBuilder.filter(esb.termQuery('occupier.i', filters.occupier));
  // }

  if (filters.construction) {
    queryBuilder.filter(esb.termsQuery('Building.status', filters.construction.map((t) => parseInt(t))));
  }

  return queryBuilder;
};

filtersToQuery.deposits = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.asteroid) {
    queryBuilder.filter(esb.termQuery('meta.location.label', Entity.IDS.ASTEROID));
    queryBuilder.filter(esb.termQuery('meta.location.id', filters.asteroid));
  }

  if (filters.resource) {
    queryBuilder.filter(esb.termsQuery('Deposit.resource', filters.resource.map((t) => parseInt(t))));
  }

  if (filters.yieldMin || filters.yieldMax) {
    const yieldRange = esb.rangeQuery('Deposit.remainingYield');
    if (filters.yieldMin) yieldRange.gte(filters.yieldMin * 1e3);
    if (filters.yieldMax) yieldRange.lte(filters.yieldMax * 1e3);
    queryBuilder.filter(yieldRange);
  }

  return queryBuilder;
};

filtersToQuery.crewmates = (filters) => {
  const queryBuilder = esb.boolQuery();
  if (filters.name) {
    queryBuilder.filter(
      esb.termQuery('Name.name', filters.name)
    );
  }
  if (filters.crew) {
    queryBuilder.filter(
      esb.termQuery('Control.controller.id', filters.crew)
    );
  }
  if (filters.class) {
    queryBuilder.filter(
      esb.termsQuery('Crewmate.class', filters.class.map((t) => parseInt(t)))
    );
  }
  if (filters.collection) {
    queryBuilder.filter(
      esb.termsQuery('Crewmate.coll', filters.collection.map((t) => parseInt(t)))
    );
  }
  return queryBuilder;
};

filtersToQuery.crews = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.owner) {
    queryBuilder.filter(esb.termQuery('Nft.owner', filters.owner));
  }

  if (filters.name) {
    queryBuilder.filter(
      esb.termQuery('Name.name', filters.name)
    );
  }

  return queryBuilder;
};

filtersToQuery.leases = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.asteroid) {
    queryBuilder.filter(esb.termQuery('meta.location.label', Entity.IDS.ASTEROID));
    queryBuilder.filter(esb.termQuery('meta.location.id', filters.asteroid));
  }

  return queryBuilder;
};

filtersToQuery.orders = (filters) => {
  const queryBuilder = esb.boolQuery();
  // TODO: ...
  return queryBuilder;
};

filtersToQuery.ships = (filters) => {
  const queryBuilder = esb.boolQuery();
  // TODO: ...
  return queryBuilder;
};

const useAssetSearch = (assetType, { from = 0, size = 2000 } = {}) => {
  const filters = useStore(s => s.assetSearch[assetType]?.filters);
  const sort = useStore(s => s.assetSearch[assetType]?.sort);
  const [ query, setQuery ] = useThrottle({}, 2, true);

  // asteroidsMapped use the exact same indices as asteroids (for now)
  // lotsMapped, actionitems, eventlog does not need to query ES
  let esAssetType = assetType;
  if (esAssetType === 'asteroidsMapped') esAssetType = 'asteroids';
  if (esAssetType === 'lotsMapped') esAssetType = '';
  if (esAssetType === 'actionitems') esAssetType = '';
  if (esAssetType === 'eventlog') esAssetType = '';

  useEffect(() => {
    if (esAssetType) {
      const q = esb.requestBodySearch();
      q.query(filtersToQuery[esAssetType](filters || {}));
      if (esAssetType === 'asteroids') q.source({ excludes: [ 'AsteroidProof' ]});
      if (sort) q.sort(esb.sort(...sort));
      q.from(from);
      q.size(size);
      q.trackTotalHits(true);

      setQuery(q.toJSON());
    }
  }, [ filters, from, size, sort ]);

  return useQuery(
    // TODO: convert this to 'entities' model of cache keys
    [ 'search', esAssetType, query ],
    () => esAssetType ? api.searchAssets(esAssetType, query) : [],
    {
      enabled: !!query,
      // keepPreviousData: true // TODO: do we want this?
    }
  );
};

export default useAssetSearch;
