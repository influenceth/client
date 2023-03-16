import { useEffect } from 'react';
import { useThrottle } from '@react-hook/throttle';
import { useQuery } from 'react-query';
import esb from 'elastic-builder';

import api from '~/lib/api';
import useStore from '~/hooks/useStore';

const useAsteroidSearch = ({ from = 0, size = 2000 } = {}) => {
  const filters = useStore(s => s.assetSearch.asteroids.filters);
  const sort = useStore(s => s.assetSearch.asteroids.sort);
  const [ query, setQuery ] = useThrottle({}, 2, true);

  useEffect(() => {
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
      queryBuilder.filter(esb.termsQuery('spectralType', filters.spectralType.split(',').map((t) => parseInt(t))));
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

    setQuery(
      esb.requestBodySearch()
        .query(queryBuilder)
        .sort(esb.sort(...(sort ? sort : ['r', 'desc'])))
        .from(from)
        .size(size)
        .trackTotalHits(true)
        .toJSON()
    );
  }, [ filters, from, size, sort ]);

  return useQuery(
    [ 'asteroids', 'search', query ],
    () => api.searchAssets('asteroids', query),
    {
      enabled: !!query,
      // keepPreviousData: true // TODO: do we want this?
    }
  );
};

export default useAsteroidSearch;
