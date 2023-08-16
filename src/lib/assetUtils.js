import { Assets, Building, Product, Ship } from '@influenceth/sdk';

const ASSET_CACHE = {};

const getSlug = (assetName) => {
  return (assetName || '').replace(/[^a-z]/ig, '');
}

const getIconUrl = (type, assetName, iconVersion, { append, w, h, f } = {}) => {
  let slug = `influence/goerli/images/icons/${type}/${getSlug(assetName)}${append || ''}.v${iconVersion || '1'}.png`;
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

const getModelUrl = (type, assetName, modelVersion) => {
  const slug = `models/${type}/${getSlug(assetName)}.v${modelVersion || '1'}.glb`;
  return `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/${slug}`;
}

export const BUILDING_SIZES = {
  w150: { w: 150 },
  w400: { w: 400 },
  w1000: { w: 1000 },
};

export const getBuildingIcon = (i, size, isHologram) => {
  let useSize = size;
  if (!size || !BUILDING_SIZES[size]) {
    if (size) console.log('getBuildingIcon - invalid size', size);
    useSize = Object.keys(BUILDING_SIZES)[0];
  }

  const cacheKey = `buildingIcon_${i}_${useSize}_${isHologram}`;
  if (!ASSET_CACHE[cacheKey]) {
    const conf = BUILDING_SIZES[useSize];
    if (isHologram) conf.append = '_Site';
    ASSET_CACHE[cacheKey] = getIconUrl('buildings', Building.TYPES[i]?.name, Assets.Building[i]?.iconVersion, conf);
  }
  return ASSET_CACHE[cacheKey];
};

export const getBuildingModel = (i) => {
  const cacheKey = `buildingModel_${i}`;
  if (!ASSET_CACHE[cacheKey]) {
    ASSET_CACHE[cacheKey] = getModelUrl('buildings', Building.TYPES[i]?.name, Assets.Building[i]?.modelVersion);
  }
  return ASSET_CACHE[cacheKey];
};


export const PRODUCT_SIZES = {
  w25: { w: 25 },
  w85: { w: 85 },
  w125: { w: 125 },
  w400: { w: 400 },
};

export const getProductIcon = (i, size) => {
  let useSize = size;
  if (!size || !PRODUCT_SIZES[size]) {
    if (size) console.log('getProductIcon - invalid size', size);
    useSize = Object.keys(PRODUCT_SIZES)[0];
  }

  const cacheKey = `productIcon_${i}_${useSize}`;
  if (!ASSET_CACHE[cacheKey]) {
    ASSET_CACHE[cacheKey] = getIconUrl('resources', Product.TYPES[i]?.name, Assets.Product[i]?.iconVersion, PRODUCT_SIZES[useSize]);
  }
  return ASSET_CACHE[cacheKey];
};

export const getProductModel = (i) => {
  return getModelUrl('resources', Product.TYPES[i]?.name, Assets.Product[i]?.modelVersion);
};


export const SHIP_SIZES = {
  w150: { w: 150 },
  w400: { w: 400 },
};

export const getShipIcon = (i, size, isHologram) => {
  let useSize = size;
  if (!size || !SHIP_SIZES[size]) {
    if (size) console.log('getShipIcon - invalid size', size);
    useSize = Object.keys(SHIP_SIZES)[0];
  }

  const cacheKey = `shipIcon_${i}_${useSize}_${isHologram}`;
  if (!ASSET_CACHE[cacheKey]) {
    const conf = SHIP_SIZES[useSize];
    if (isHologram) conf.append = '_Holo';
    ASSET_CACHE[cacheKey] = getIconUrl('ships', Ship.TYPES[i]?.name, Assets.Ship[i]?.iconVersion, conf);
  }
  return ASSET_CACHE[cacheKey];
};

export const getShipModel = (i) => {
  const cacheKey = `shipModel_${i}`;
  if (!ASSET_CACHE[cacheKey]) {
    ASSET_CACHE[cacheKey] = getModelUrl('ships', Ship.TYPES[i]?.name, Assets.Ship[i]?.modelVersion);
  }
  return ASSET_CACHE[cacheKey];
};
