import { useMemo } from '~/lib/react-debug';
import { Asteroid, Product } from '@influenceth/sdk';

import { keyify } from '~/lib/utils';

const useAsteroidAbundances = (asteroid) => {
  const data = useMemo(import.meta.url, () => {
    if (asteroid?.Celestial?.scanStatus === Asteroid.SCAN_STATUSES.RESOURCE_SCANNED) {
      const categories = {};
      const abundances = Asteroid.Entity.getAbundances(asteroid);
      const bonuses = Asteroid.Entity.getBonuses(asteroid);

      Object.keys(abundances).forEach((i) => {
        const abundance = abundances[i];
        if (abundance > 0) {
          const { category, name } = Product.TYPES[i];

          const categoryKey = keyify(category);
          if (!categories[category]) {
            categories[category] = {
              categoryKey,
              category,
              bonus: bonuses.find((b) => b.type === categoryKey.toLowerCase()),
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
  }, [asteroid]);  // eslint-disable-line react-hooks/exhaustive-deps

  return data;
};

export default useAsteroidAbundances;
