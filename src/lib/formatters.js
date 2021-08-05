import utils from 'influence-utils';
import { utils as ethersUtils } from 'ethers';

const formatters = {

  // Orbital element formatters
  axis: (a) => a.toLocaleString() + ' AU',

  inclination: (i) => (i * 180 / Math.PI).toLocaleString() + '°',

  period: (a) => {
    const orbit = new utils.KeplerianOrbit({ a });
    return orbit.getPeriod().toFixed(0).toLocaleString() + ' days';
  },

  // Asteroid attribute formatters
  radius: (r) => r.toLocaleString() + ' m',

  spectralType: (t) => utils.toSpectralType(t) + '-type',

  surfaceArea: (r) => {
    const area = (4 * Math.PI * Math.pow(r / 1000, 2)).toFixed(1);
    return Number(area).toLocaleString() + ' km²';
  },

  scanningBoost: (po) => {
    let desc = 'No boost';
    if (po > 0 && po <= 100) desc = '4x';
    if (po > 100 && po <= 1100) desc = '3x';
    if (po > 1100 && po <= 11100) desc = '2x';
    return desc;
  },

  // Account formatters
  assetOwner: (owner = null) => {
    if (owner) {
      const url = `${process.env.REACT_APP_OPEN_SEA_URL}/accounts/${owner}`;
      return <a target="_blank" rel="noreferrer" href={url}>{owner}</a>;
    } else {
      return 'Un-owned';
    }
  },

  asteroidPrice: (r, sale) => {
    const base = Number(ethersUtils.formatEther(sale.baseAsteroidPrice));
    const lot = Number(ethersUtils.formatEther(sale.baseLotPrice));
    const price = base + (lot * 4 * Math.pow((r / 1000), 2));
    return price;
  }
};

export default formatters;
