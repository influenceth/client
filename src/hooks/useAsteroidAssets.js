import { useMemo } from 'react';
import { RESOURCES, toResources } from 'influence-utils';

import useAssets from './useAssets';

const useAsteroidAssets = (asteroid) => {
  const { data: assets, isLoading } = useAssets();

  const data = useMemo(() => {
    if (assets?.length > 0 && asteroid?.scanned) {
      // TODO: RESOURCES are one-indexed, are we handling that as needed here?
      const resourceDefs = Object.values(RESOURCES);
      const asteroidAbundances = toResources(asteroid.resources || []);

      // TODO (enhancement): might be nice to change "bucket" to "category" in asset collection model
      const categories = {};
      assets
        .map((a) => ({
          ...a,
          i: resourceDefs.findIndex((r) => r.name === a.label) + 1
        }))
        .filter((a) => a.i > 0 && asteroidAbundances[a.label] > 0)
        .forEach((a) => {
          const categoryKey = a.bucket.replace(/[^a-zA-Z]/g, '');
          if (!categories[a.bucket]) {
            categories[a.bucket] = {
              category: categoryKey,
              label: a.bucket,
              bonus: asteroid.bonuses.find((b) => b.type === categoryKey.toLowerCase()),
              resources: [],
              abundance: 0,
            };
          }
          categories[a.bucket].abundance += asteroidAbundances[a.label];
          categories[a.bucket].resources.push({
            i: a.i,
            category: categoryKey,
            categoryLabel: a.bucket,
            label: a.label,
            iconUrl: a.iconUrl,
            abundance: asteroidAbundances[a.label],
          });
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
  }, [!!assets, asteroid?.scanned, asteroid?.abundances]);  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoading,
    data
  }
};

export default useAsteroidAssets;
