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

  asteroidPrice: (r, sale) => {
    const base = Number(ethersUtils.formatEther(String(sale.basePrice)));
    const lot = Number(ethersUtils.formatEther(String(sale.saleModifier)));
    const lotCount = Math.floor(4 * Math.PI * (r / 1000) ** 2);
    const price = base + lot * lotCount;
    return price.toLocaleString([], { maximumFractionDigits: 4 });
  },

  crewPrice: (sale) => {
    const price = Number(ethersUtils.formatEther(String(sale.basePrice)));
    return price.toLocaleString([], { maximumFractionDigits: 3 });
  }
};

export default formatters;
