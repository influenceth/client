import { useEffect, useMemo, useState } from 'react';
import { useThrottle } from '@react-hook/throttle';
import { useQuery } from 'react-query';
import esb from 'elastic-builder';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const filtersToQuery = {};

filtersToQuery.asteroids = (filters) => {
  const queryBuilder = esb.boolQuery();
  if (filters.ownedBy) {
    if (filters.ownedBy === 'unowned') {
      queryBuilder.mustNot(esb.existsQuery('owner'))
    } else if (filters.ownedBy === 'owned') {
      queryBuilder.filter(esb.existsQuery('owner'))
    } else if (filters.ownedBy) {
      queryBuilder.filter(esb.termQuery('owner', filters.ownedBy));
    }
  }

  if (filters.radiusMin || filters.radiusMax) {
    const radiusRange = esb.rangeQuery('r');
    if (filters.radiusMin) radiusRange.gte(filters.radiusMin);
    if (filters.radiusMax) radiusRange.lte(filters.radiusMax);
    queryBuilder.filter(radiusRange);
  }

  if (filters.spectralType) {
    queryBuilder.filter(esb.termsQuery('spectralType', filters.spectralType.map((t) => parseInt(t))));
  }

  if (filters.axisMin || filters.axisMax) {
    const axisRange = esb.rangeQuery('orbital.a');
    if (filters.axisMin) axisRange.gte(filters.axisMin);
    if (filters.axisMax) axisRange.lte(filters.axisMax);
    queryBuilder.filter(axisRange);
  }

  if (filters.eccMin || filters.eccMax) {
    const eccRange = esb.rangeQuery('orbital.e');
    if (filters.eccMin) eccRange.gte(filters.eccMin);
    if (filters.eccMax) eccRange.lte(filters.eccMax);
    queryBuilder.filter(eccRange);
  }

  if (filters.incMin || filters.incMax) {
    const incRange = esb.rangeQuery('orbital.i');
    if (filters.incMin) incRange.gte(filters.incMin);
    if (filters.incMax) incRange.lte(filters.incMax);
    queryBuilder.filter(incRange);
  }

  if (filters.name) {
    queryBuilder.filter(
      esb.multiMatchQuery(['baseName', 'customName'], filters.name)
    );
  }
  return queryBuilder;
};

filtersToQuery.buildings = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.type) {
    queryBuilder.filter(esb.termsQuery('type', filters.type.map((t) => parseInt(t))));
  }

  return queryBuilder;
};

filtersToQuery.coresamples = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.resource) {
    queryBuilder.filter(esb.termsQuery('resource', filters.resource.map((t) => parseInt(t))));
  }

  if (filters.yieldMin || filters.yieldMax) {
    const yieldRange = esb.rangeQuery('remainingYield');
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
      esb.termQuery('name', filters.name)
    );
  }
  if (filters.crew) {
    queryBuilder.filter(
      esb.termQuery('crew.i', filters.crew)
    );
  }
  if (filters.class) {
    queryBuilder.filter(
      esb.termsQuery('class', filters.class.map((t) => parseInt(t)))
    );
  }
  if (filters.collection) {
    queryBuilder.filter(
      esb.termsQuery('collection', filters.collection.map((t) => parseInt(t)))
    );
  }
  return queryBuilder;
};

filtersToQuery.crews = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.owner) {
    queryBuilder.filter(esb.termQuery('owner', filters.owner));
  }

  if (filters.name) {
    queryBuilder.filter(
      esb.termQuery('name', filters.name)
    );
  }

  return queryBuilder;
};

filtersToQuery.leases = (filters) => {
  const queryBuilder = esb.boolQuery();
  return queryBuilder;
};

filtersToQuery.lots = (filters) => {
  const queryBuilder = esb.boolQuery();

  if (filters.asteroid) {
    queryBuilder.filter(esb.termQuery('asteroid.i', filters.asteroid));
  }

  if (filters.controller) {
    queryBuilder.filter(esb.termQuery('controller.i', filters.controller));
  }

  if (filters.occupier) {
    queryBuilder.filter(esb.termQuery('occupier.i', filters.occupier));
  }

  if (filters.building) {
    queryBuilder.filter(esb.termsQuery('building.type', filters.building.map((t) => parseInt(t))));
  }

  if (filters.construction) {
    queryBuilder.filter(esb.termsQuery('construction.status', filters.construction.map((t) => parseInt(t))));
  }

  return queryBuilder;
};

filtersToQuery.orders = (filters) => {
  const queryBuilder = esb.boolQuery();
  return queryBuilder;
};

filtersToQuery.ships = (filters) => {
  const queryBuilder = esb.boolQuery();
  return queryBuilder;
};

const useAssetSearch = (assetType, { from = 0, size = 2000 } = {}) => {
  const filters = useStore(s => s.assetSearch[assetType]?.filters);
  const sort = useStore(s => s.assetSearch[assetType]?.sort);
  const [ query, setQuery ] = useThrottle({}, 2, true);

  // asteroidsMapped use the exact same indices as asteroids for now
  // lotsMapped does not need to query ES
  let esAssetType = assetType;
  if (esAssetType === 'asteroidsMapped') esAssetType = 'asteroids';
  if (esAssetType === 'lotsMapped') esAssetType = '';
  
  useEffect(() => {
    if (esAssetType) {
      const q = esb.requestBodySearch();
      q.query(filtersToQuery[esAssetType](filters || {}));
      if (sort) q.sort(esb.sort(...sort));
      q.from(from);
      q.size(size);
      q.trackTotalHits(true);
  
      setQuery(q.toJSON());
    }
  }, [ filters, from, size, sort ]);

  return useQuery(
    [ 'search', esAssetType, query ],
    () => esAssetType ? api.searchAssets(esAssetType, query) : [],
    {
      enabled: !!query,
      // keepPreviousData: true // TODO: do we want this?
    }
  );
};

export default useAssetSearch;
