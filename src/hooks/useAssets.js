import { useQuery } from 'react-query';

import api from '~/lib/api';

const getCloudfrontUrl = (key, { w, h, f } = {}) => {
  // TODO: (the "replace" is temporarily necessary until the Goerli data has been migrated)
  let slug = key.replace(`${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/`, '');
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

const useAssets = () => {
  return useQuery(
    [ 'assets' ],
    () => new Promise((resolve) => {
      api.getAssets().then((assets) => {
        const transformed = assets.map((a) => {
          const iconUrls = {};
          if (a.assetType === 'Resource') {
            iconUrls.w25 = getCloudfrontUrl(a.iconUrl, { w: 25 });
            iconUrls.w85 = getCloudfrontUrl(a.iconUrl, { w: 85 });
            iconUrls.w125 = getCloudfrontUrl(a.iconUrl, { w: 125 });
            iconUrls.w400 = getCloudfrontUrl(a.iconUrl, { w: 400 });
          } else if (a.assetType === 'Building') {
            iconUrls.w400 = getCloudfrontUrl(a.iconUrl, { w: 400 });
          } else {
            console.error(`${a.assetType} ASSET TYPE does not have any icon sizes set!`);
          }
          return {
            ...a,
            // TODO: (the "replace" is temporarily necessary until the Goerli data has been migrated)
            modelUrl: `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/${a.modelUrl.replace(`${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/`, '')}`,
            iconUrl: getCloudfrontUrl(a.iconUrl),
            iconUrls
          }
        });
        resolve(transformed);
      });
    }),
    {}
  );
};

export default useAssets;
