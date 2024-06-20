import { Assets, Building, Product, Ship } from '@influenceth/sdk';

const ASSET_CACHE = {};

export const getCloudfrontUrl = (rawSlug, { w, h, f } = {}) => {
  const slug = (w || h)
    ? window.btoa(
      JSON.stringify({
        key: rawSlug,
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
    : rawSlug;
  return `${process.env.REACT_APP_CLOUDFRONT_IMAGE_URL}/${slug}`;
}

const getSlug = (assetName) => {
  return (assetName || '').replace(/[^a-z]/ig, '');
}

const getIconUrl = ({ type, assetName, iconVersion, append, w, h, f } = {}) => {
  const environment = process.env.REACT_APP_DEPLOYMENT || 'production';

  return getCloudfrontUrl(
    `influence/${environment}/images/icons/${type}/${getSlug(assetName)}${append || ''}.v${iconVersion || '1'}.png`,
    { w, h, f }
  );
}

export const getModelUrl = ({ type, assetName, modelVersion, append } = {}) => {
  let slug = `models/${type}/${getSlug(assetName)}${append || ''}`;
  if (modelVersion) slug += `.v${modelVersion}`;
  slug += '.glb';
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
    const conf = {
      type: 'buildings',
      assetName: Building.TYPES[i]?.name,
      ...BUILDING_SIZES[useSize]
    };

    if (isHologram) conf.append = '_Site';
    ASSET_CACHE[cacheKey] = getIconUrl(conf);
  }

  return ASSET_CACHE[cacheKey];
};

export const getBuildingModel = (i) => {
  const cacheKey = `buildingModel_${i}`;

  if (!ASSET_CACHE[cacheKey]) {
    ASSET_CACHE[cacheKey] = getModelUrl({ type: 'buildings', assetName: Building.TYPES[i]?.name });
  }

  return ASSET_CACHE[cacheKey];
};

export const getLotShipIcon = (i, size) => {
  let useSize = size;
  if (!size || !BUILDING_SIZES[size]) {
    if (size) console.log('getBuildingIcon - invalid size', size);
    useSize = Object.keys(BUILDING_SIZES)[0];
  }

  const cacheKey = `buildingShipIcon_${i}_${useSize}`;
  if (!ASSET_CACHE[cacheKey]) {
    const conf = {
      type: 'buildings',
      assetName: Ship.TYPES[i]?.name,
      ...BUILDING_SIZES[useSize]
    };

    ASSET_CACHE[cacheKey] = getIconUrl(conf);
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
    const conf = {
      type: 'resources',
      assetName: Product.TYPES[i]?.name,
      ...PRODUCT_SIZES[useSize]
    };

    ASSET_CACHE[cacheKey] = getIconUrl(conf);
  }

  return ASSET_CACHE[cacheKey];
};

// TODO: eliminate versioning once we audit / update all models in S3
export const getProductModel = (i) => {
  return getModelUrl({
    type: 'resources',
    assetName: Product.TYPES[i]?.name,
    modelVersion: Assets.Product[i]?.modelVersion
  });
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
    const conf = {
      type: 'ships',
      assetName: Ship.TYPES[i]?.name,
      ...SHIP_SIZES[useSize]
    };

    if (isHologram) conf.append = '_Holo';
    ASSET_CACHE[cacheKey] = getIconUrl(conf);
  }

  return ASSET_CACHE[cacheKey];
};

export const getShipModel = (i, variant = 1) => {
  const cacheKey = `shipModel_${i}_${variant}`;

  if (!ASSET_CACHE[cacheKey]) {
    const conf = { type: 'ships', assetName: Ship.TYPES[i]?.name };
    if (variant > 1) conf.append = `_Variant${variant}`;
    ASSET_CACHE[cacheKey] = getModelUrl(conf);
  }

  return ASSET_CACHE[cacheKey];
};
