import { AdalianOrbit, Asteroid } from '@influenceth/sdk';
import { utils as ethersUtils } from 'ethers';

const formatters = {

  // Orbital element formatters
  axis: (a) => a.toLocaleString() + ' AU',

  inclination: (i) => (i * 180 / Math.PI).toLocaleString() + '°',

  period: (orbital) => {
    const orbit = new AdalianOrbit(orbital);
    return Math.round(orbit.getPeriod()).toLocaleString() + ' days';
  },

  // Asteroid attribute formatters
  radius: (r) => r.toLocaleString() + ' m',

  spectralType: (t) => Asteroid.getSpectralType(t) + '-type',

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

  asteroidName: (a, fallbackText) => {
    if (!a) return fallbackText || 'Asteroid';
    return a.Name?.name || a.Celestial?.baseName || `Asteroid #${a.i.toLocaleString()}`;
  },

  asteroidPrice: (r, sale) => {
    if (!sale?.basePrice || !sale?.saleModifier) return '?';
    const base = Number(ethersUtils.formatEther(String(sale.basePrice)));
    const lot = Number(ethersUtils.formatEther(String(sale.saleModifier)));
    const lotCount = Math.floor(4 * Math.PI * (r / 1000) ** 2);
    const price = base + lot * lotCount;
    return price.toLocaleString([], { maximumFractionDigits: 4 });
  },

  buildingName: (b, fallbackText) => {
    if (!b) return fallbackText || 'Building';
    return b.Name?.name || `${Building.TYPES[b.Building?.buildingType]?.name || 'Building'} #${b.i.toLocaleString()}`;
  },

  crewName: (c, fallbackText) => {
    if (!c) return fallbackText || 'Crew';
    return c.Name?.name || `Crew #${c.i.toLocaleString()}`;
  },

  crewPrice: (sale) => {
    if (!sale?.basePrice) return '?';
    const price = Number(ethersUtils.formatEther(String(sale.basePrice)));
    return price.toLocaleString([], { maximumFractionDigits: 3 });
  },

  crewmateName: (c, fallbackText) => {
    if (!c) return fallbackText || 'Crewmate';
    return c.Name?.name || `Crewmate #${c.i.toLocaleString()}`;
  },

  shipName: (s, fallbackText) => {
    if (!s) return fallbackText || 'Ship';
    return s.Name?.name || `${Ship.TYPES[s.Ship?.shipType]?.name || 'Ship'} #${s.i.toLocaleString()}`;
  },
};

export default formatters;
