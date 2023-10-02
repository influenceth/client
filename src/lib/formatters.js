import { AdalianOrbit, Asteroid, Building, Ship } from '@influenceth/sdk';
import { utils as ethersUtils } from 'ethers';
import { constants } from '@influenceth/astro';

const formatters = {

  // Orbital element formatters
  axis: (a) => (a * 1000 / constants.AU).toLocaleString() + ' AU',

  inclination: (i) => (i * 180 / Math.PI).toLocaleString() + '°',

  period: (orbital) => {
    const orbit = new AdalianOrbit(orbital, { units: 'km' });
    return Math.round(orbit.getPeriod()).toLocaleString() + ' days';
  },

  // Asteroid attribute formatters
  radius: (r) => r.toLocaleString() + ' km',

  spectralType: (t) => Asteroid.getSpectralType(t) + '-type',

  surfaceArea: (r) => {
    const area = (4 * Math.PI * Math.pow(r, 2)).toFixed(1);
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
    return a.Name?.name || Asteroid.Entity.getBaseName(a) || `Asteroid #${a.id.toLocaleString()}`;
  },

  asteroidPrice: (r, priceConstants) => {
    if (!priceConstants?.ASTEROID_BASE_PRICE_ETH || !priceConstants?.ASTEROID_LOT_PRICE_ETH) return '?';
    const base = Number(ethersUtils.formatEther(String(priceConstants.ASTEROID_BASE_PRICE_ETH)));
    const lot = Number(ethersUtils.formatEther(String(priceConstants.ASTEROID_LOT_PRICE_ETH)));

    const lotCount = Asteroid.getSurfaceArea(0, r);
    const price = base + lot * lotCount;
    return price.toLocaleString([], { maximumFractionDigits: 3 });
  },

  buildingName: (b, fallbackText) => {
    if (!b) return fallbackText || 'Building';
    return b.Name?.name || `${Building.TYPES[b.Building?.buildingType]?.name || 'Building'} #${b.id.toLocaleString()}`;
  },

  crewName: (c, fallbackText) => {
    if (!c) return fallbackText || 'Crew';
    return c.Name?.name || `Crew #${c.id.toLocaleString()}`;
  },

  crewmatePrice: (priceConstants) => {
    if (!priceConstants?.ADALIAN_PRICE_ETH) return '?';
    const price = Number(ethersUtils.formatEther(String(priceConstants?.ADALIAN_PRICE_ETH)));
    return price.toLocaleString([]);
  },

  crewmateName: (c, fallbackText) => {
    if (!c) return fallbackText || 'Crewmate';
    return c.Name?.name || `Crewmate #${(c.id || 0).toLocaleString()}`;
  },

  crewmateTraitDescription: (desc) => {
    if (!desc) return '';
    let bonus = desc.match(/[0-9]*%/)
    bonus = bonus ? bonus[0] : null;
    const parts = desc.split(/([0-9]*%)/)
    return <span> { parts.map((part, i) =>
      <span key={i} style={part === bonus ? { color: 'white', fontWeight: 'bold' } : {} }>{ part }</span>
    )
  } </span>;
  },

  lotName: (lotId) => {
    if (!lotId) return 'Lot';
    return `Lot ${lotId.toLocaleString()}`;
  },

  shipName: (s, fallbackText) => {
    if (!s) return fallbackText || 'Ship';
    return s.Name?.name || `${Ship.TYPES[s.Ship?.shipType]?.name || 'Ship'} #${s.id.toLocaleString()}`;
  },
};

export default formatters;