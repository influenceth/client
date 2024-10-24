import { AdalianOrbit, Asteroid, Building, Entity, Lot, Ship } from '@influenceth/sdk';
import { constants } from '@influenceth/astro';
import { safeBigInt } from './utils';

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
    return a.Name?.name || (a.Celestial && Asteroid.Entity.getBaseName(a)) || `#${a.id.toLocaleString()}`;
  },

  buildingName: (b, fallbackText) => {
    if (!b) return fallbackText || 'Building';
    return b.Name?.name || `${Building.TYPES[b.Building?.buildingType]?.name || 'Building'} #${b.id.toLocaleString()}`;
  },

  crewName: (c, fallbackText) => {
    if (!c) return fallbackText || 'Crew';
    return c.Name?.name || `Crew #${c.id.toLocaleString()}`;
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
    return (
      <span>
        {parts.map((part, i) => (
          <span key={i} style={part === bonus ? { color: 'white', fontWeight: 'bold' } : {} }>{ part }</span>
        ))}
      </span>
    );
  },

  lotName: (lotOrIndex) => {
    let lotIndex = lotOrIndex?.id || lotOrIndex;
    if (!lotIndex) return 'Lot';
    if (safeBigInt(lotIndex) >= 2n ** 32n) lotIndex = Lot.toIndex(lotIndex);
    return `Lot #${lotIndex.toLocaleString()}`;
  },

  shipName: (s, fallbackText) => {
    if (!s) return fallbackText || 'Ship';
    return s.Name?.name || `${Ship.TYPES[s.Ship?.shipType]?.name || 'Ship'} #${s.id.toLocaleString()}`;
  },

  entityName: (e, fallbackText) => {
    if (!e) return fallbackText || 'Entity';
    switch (e.label) {
      case Entity.IDS.ASTEROID: return formatters.asteroidName(e, fallbackText);
      case Entity.IDS.BUILDING: return formatters.buildingName(e, fallbackText);
      case Entity.IDS.SHIP: return formatters.shipName(e, fallbackText);
      case Entity.IDS.CREW: return formatters.crewName(e, fallbackText);
      case Entity.IDS.CREWMATE: return formatters.crewmateName(e, fallbackText);
      case Entity.IDS.LOT: return formatters.lotName(e, fallbackText);
      default: return fallbackText || 'Entity';
    }
  }
};

export default formatters;