import { useMemo } from 'react';
import { Capable, Inventory } from '@influenceth/sdk';
import { keyify } from '~/lib/utils';

const getSlug = (asset) => {
  return asset.name.replace(/[^a-z]/ig, '');
}

const getIconUrl = (asset, type, { append, w, h, f } = {}) => {
  let slug = `influence/goerli/images/icons/${type}/${getSlug(asset)}${append || ''}.v${asset.iconVersion || '1'}.png`;
  if (w || h) {
    slug = window.btoa(
      JSON.stringify({
        key: slug,
        bucket: process.env.REACT_APP_CLOUDFRONT_BUCKET,
        edits: {
          resize: {
            width: w,
            height: h,
            fit: f
          }
        }
      })
    )
  }
  return `${process.env.REACT_APP_CLOUDFRONT_IMAGE_URL}/${slug}`;
}

const getModelUrl = (asset, type) => {
  const slug = `models/${type}/${getSlug(asset)}.v${asset.modelVersion || '1'}.glb`;
  return `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/${slug}`;
}

export const useBuildingAssets = () => {
  return useMemo(() => Object.keys(Capable.TYPES)
  .filter((i) => Capable.TYPES[i].category === 'Building')
  .map((i) => {
    const asset = {
      ...Capable.TYPES[i],
      i: Number(i),
    };

    asset.iconUrl = getIconUrl(asset, 'buildings');
    asset.iconUrls = {
      w150: getIconUrl(asset, 'buildings', { w: 150 }),
      w400: getIconUrl(asset, 'buildings', { w: 400 }),
    };

    asset.siteIconUrls = {
      w150: getIconUrl(asset, 'buildings', { w: 150, append: '_Site' }),
      w400: getIconUrl(asset, 'buildings', { w: 400, append: '_Site' }),
    };

    asset.modelUrl = getModelUrl(asset, 'buildings');

    return asset;
  }), []);
};

export const useResourceAssets = () => {
  return useMemo(() => {
    const resourcesById = [];
    Object.keys(Inventory.RESOURCES).forEach((i) => {
      const asset = {
        ...Inventory.RESOURCES[i],
        i,
      };
      asset.categoryKey = keyify(asset.category);

      asset.iconUrl = getIconUrl(asset, 'resources');
      asset.iconUrls = {
        w25: getIconUrl(asset, 'resources', { w: 25 }),
        w85: getIconUrl(asset, 'resources', { w: 85 }),
        w125: getIconUrl(asset, 'resources', { w: 125 }),
        w400: getIconUrl(asset, 'resources', { w: 400 }),
      };

      asset.modelUrl = getModelUrl(asset, 'resources');

      resourcesById[i] = asset;
    });
    return resourcesById;
  }, []);
};

// TODO: this should be in SDK
// masses are in tons
const Ship = {
  TYPES: {
    1: {
      name: 'Shuttle',
      emptyMass: 100e3,
      maxPropellantMass: 950e3,
      maxCargoMass: 10e3,
      engines: 1,
      maxThrust: 612916,
      spaceportRequired: true,
      iconVersion: 1,
      modelVersion: 1
    },
    2: {
      name: 'Light Transport',
      emptyMass: 180e3,
      maxPropellantMass: 1805e3,
      maxCargoMass: 2000e3,
      engines: 2,
      maxThrust: 1225831,
      spaceportRequired: false,
      iconVersion: 1,
      modelVersion: 1
    },
    3: {
      name: 'Heavy Transport',
      emptyMass: 1010e3,
      maxPropellantMass: 11875e3,
      maxCargoMass: 12000e3,
      engines: 9,
      maxThrust: 5516241,
      spaceportRequired: true,
      iconVersion: 1,
      modelVersion: 1
    }
  }
}
export const useShipAssets = () => {
  return useMemo(() => Object.keys(Ship.TYPES)
  .map((i) => {
    const asset = {
      ...Ship.TYPES[i],
      i: Number(i),
    };

    asset.iconUrl = getIconUrl(asset, 'ships');
    asset.iconUrls = {
      w150: getIconUrl(asset, 'ships', { w: 150 }),
      w400: getIconUrl(asset, 'ships', { w: 400 }),
    };

    asset.simIconUrls = {
      w150: getIconUrl(asset, 'ships', { w: 150, append: '_Holo' }),
      w400: getIconUrl(asset, 'ships', { w: 400, append: '_Holo' }),
    };

    asset.modelUrl = getModelUrl(asset, 'ships');

    return asset;
  }), []);
};