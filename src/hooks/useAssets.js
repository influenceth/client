import { useMemo } from 'react';
import { Building, Inventory } from '@influenceth/sdk';
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
  return useMemo(() => 
    Object.values(Building.TYPES).map((b) => {
      const asset = { ...b };

      asset.iconUrl = getIconUrl(asset, 'buildings');
      asset.iconUrls = {
        w150: getIconUrl(asset, 'buildings', { w: 150 }),
        w400: getIconUrl(asset, 'buildings', { w: 400 }),
        w1000: getIconUrl(asset, 'buildings', { w: 1000 }),
      };

      asset.siteIconUrls = {
        w150: getIconUrl(asset, 'buildings', { w: 150, append: '_Site' }),
        w400: getIconUrl(asset, 'buildings', { w: 400, append: '_Site' }),
        w1000: getIconUrl(asset, 'buildings', { w: 1000, append: '_Site' }),
      };

      asset.modelUrl = getModelUrl(asset, 'buildings');

      return asset;
    }),
    []
  );
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
      maxPassengers: 10,
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
      maxPassengers: 20,
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
      maxPassengers: 50,
      maxCargoMass: 12000e3,
      engines: 9,
      maxThrust: 5516241,
      spaceportRequired: true,
      iconVersion: 1,
      modelVersion: 1
    },
    4: {
      name: 'Escape Pod',
      emptyMass: 50e3,
      maxPropellantMass: 250e3,
      maxCargoMass: 0,
      maxPassengers: 5,
      engines: 1,
      maxThrust: 612916,
      spaceportRequired: true,
      iconVersion: 1,
      modelVersion: 1
    }
  }
}

export const useShipAssets = () => {
  return useMemo(() => {
    const shipsByClass = [];
    Object.keys(Ship.TYPES).forEach((i) => {
      const asset = {
        ...Ship.TYPES[i],
        i: Number(i),
        category: 'Ship'
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

      asset.className = asset.name;

      shipsByClass[i] = asset;
    });
    
    return shipsByClass;
  }, []);
};