import { useMemo } from 'react';
import { Capable, Inventory } from '@influenceth/sdk';

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
  const slug = `influence/goerli/models/${type}/${getSlug(asset)}.v${asset.modelVersion || '1'}.glb`;
  return `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/${slug}`;
}

export const useBuildingAssets = () => {
  return useMemo(() => Object.keys(Capable.TYPES)
  .filter((i) => Capable.TYPES[i].category === 'Building')
  .map((i) => {
    const asset = {
      ...Capable.TYPES[i],
      i,

      // TODO: remove these once sdk updated:
      iconVersion: 1,
      modelVersion: 1
    };

    asset.iconUrl = getIconUrl(asset, 'buildings');
    asset.iconUrls = {
      w150: getIconUrl(asset, 'buildings', { w: 150 }),
      w400: getIconUrl(asset, 'buildings', { w: 400 }),
    };

    asset.siteIconUrls = {
      w150: getIconUrl(asset, 'buildings', { w: 150, append: '_site' }),
      w400: getIconUrl(asset, 'buildings', { w: 400, append: '_site' }),
    };

    asset.modelUrl = getModelUrl(asset, 'buildings');

    return asset;
  }), []);
};

export const useResourceAssets = () => {
  return useMemo(() => Object.keys(Inventory.RESOURCES).map((i) => {
    const asset = {
      ...Inventory.RESOURCES[i],
      i,
    };

    asset.iconUrl = getIconUrl(asset, 'resources');
    asset.iconUrls = {
      w25: getIconUrl(asset, 'resources', { w: 25 }),
      w85: getIconUrl(asset, 'resources', { w: 85 }),
      w125: getIconUrl(asset, 'resources', { w: 125 }),
      w400: getIconUrl(asset, 'resources', { w: 400 }),
    };

    asset.modelUrl = getModelUrl(asset, 'resources');

    return asset;
  }), []);
};
