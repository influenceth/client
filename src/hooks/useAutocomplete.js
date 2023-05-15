import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useThrottle } from '@react-hook/throttle';
import esb from 'elastic-builder';
import api from '~/lib/api';

let sort;

const configByType = {
  asteroids: {
    formatFootnote: (a) => `ID #${(a.i || '').toLocaleString()}`,
    formatLabel: (a) => a?.customName || a?.baseName || '',
    valueKey: 'i'
  },
}

const useAutocomplete = (assetType) => {
  const [ searchTerm, setSearchTerm ] = useState('');
  const [ query, setQuery ] = useThrottle({}, 2, true);
  
  useEffect(() => {
    if (!assetType) return;
    if (searchTerm) {
      const q = esb.requestBodySearch();

      let queryBuilder;
      if (assetType === 'asteroids') {
        queryBuilder = esb.boolQuery();

        // if all numeric, also search against id
        const matchAgainst = ['customName', 'baseName'];
        if (!/^[^0-9]/.test(searchTerm)) matchAgainst.unshift('i');
        queryBuilder.filter(
          esb.multiMatchQuery(matchAgainst, searchTerm)
        );
      }

      if (queryBuilder) q.query(queryBuilder);
      if (sort) q.sort(esb.sort(...sort));
      q.from(0);
      q.size(50);
  
      setQuery(q.toJSON());
    } else {
      // TODO: default response for asset type
    }
  }, [ assetType, searchTerm, sort ]);

  const { data, isLoading } = useQuery(
    [ 'search', assetType, query ],
    () => assetType && query ? api.searchAssets(assetType, query) : [],
    { enabled: !!query }
  );

  return {
    ...configByType[assetType],
    options: data?.hits || [],
    isLoading,
    searchTerm,
    setSearchTerm
  }
};

export default useAutocomplete;