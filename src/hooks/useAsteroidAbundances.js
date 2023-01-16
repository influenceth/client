import { useMemo } from 'react';
import { keyify } from '~/lib/utils';

import { useResourceAssets } from './useAssets';

const useAsteroidAbundances = (asteroid) => {
  const assets = useResourceAssets();

  const data = useMemo(() => {
    if (assets?.length > 0 && asteroid?.scanned) {
      const categories = {};
      Object.keys(asteroid.resources || {}).forEach((i) => {
        const abundance = asteroid.resources[i];
        if (abundance > 0) {
          const { category, name, iconUrls } = (assets.find((a) => a?.i === i) || {});

          const categoryKey = keyify(category);
          if (!categories[category]) {
            categories[category] = {
              categoryKey,
              category,
              bonus: asteroid.bonuses.find((b) => b.type === categoryKey.toLowerCase()),
              resources: [],
              abundance: 0,
            };
          }

          categories[category].abundance += abundance;
          categories[category].resources.push({
            i,
            categoryKey,
            category,
            name,
            iconUrls,
            abundance
          });
        }
      });

      // sort resources in each category and sort each category
      return Object.values(categories)
        .map((category) => ({
          ...category,
          resources: category.resources.sort((a, b) => b.abundance - a.abundance)
        }))
        .sort((a, b) => b.abundance - a.abundance);
    }
    return [];
  }, [!!assets, asteroid?.scanned, asteroid?.resources]);  // eslint-disable-line react-hooks/exhaustive-deps

  return data;
};

export default useAsteroidAbundances;
