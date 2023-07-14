import { Capable, Crew, START_TIMESTAMP } from '@influenceth/sdk';

// The difference in game days between the start timestamp and the lore start time
// TODO: should 1618668000 instead live in influence-utils?
export const LORE_TIME_DIFF = 24 * (1618668000 - START_TIMESTAMP) / 86400;

export const orbitTimeToGameTime = (orbitTime) => {
  return orbitTime - LORE_TIME_DIFF;
};

export const orbitTimeToRealDate = (orbitTime) => {
  return new Date((orbitTime * 86400 / 24 + START_TIMESTAMP) * 1000);
};

export const unixTimeToGameTime = (unixTime) => {
  const orbitTime = (unixTime - START_TIMESTAMP) / 3600;
  return orbitTimeToGameTime(orbitTime);
};

export const getCrewAbilityBonus = (abilityId, crewmates) => {
  return Crew.getAbilityBonus(abilityId, crewmates.map((crewmate) => ({
    classId: crewmate.crewClass,
    titleId: crewmate.title,
    traitIds: crewmate.traits
  })));
}

export const capableTypeNameToId = (name) => {
  return Object.keys(Capable.TYPES).find((i) => Capable.TYPES[i].name === name);
}

const timerIncrements = {
  d: 86400,
  h: 3600,
  m: 60,
  s: 1
};

export const formatTimer = (secondsRemaining, maxPrecision = null) => {
  let remainder = secondsRemaining;
  const parts = Object.keys(timerIncrements).reduce((acc, k) => {
    if (acc.length > 0 || remainder >= timerIncrements[k] || timerIncrements[k] === 1) {
      const unit = Math.floor(remainder / timerIncrements[k]);
      remainder = remainder % timerIncrements[k];
      acc.push(`${unit}${k}`);
    }
    return acc;
  }, []);
  if (maxPrecision) return parts.slice(0, maxPrecision).join(' ');
  return parts.join(' ');
};

export const formatFixed = (value, maximumFractionDigits = 0) => {
  const div = 10 ** maximumFractionDigits;
  return (Math.round((value || 0) * div) / div).toLocaleString();
};

export const formatPrecision = (value, maximumPrecision = 0) => {
  const allowedDecimals = Math.max(0, maximumPrecision - Math.ceil(Math.log10(Math.abs(value))));
  if (isNaN(allowedDecimals)) { console.log('is nan', value, maximumPrecision); }
  return formatFixed(value, allowedDecimals);
};

export const formatPrice = (sway, { minPrecision = 3, fixedPrecision } = {}) => {
  let unitLabel;
  let scale;
  if (sway >= 1e6) {
    scale = 1e6;
    unitLabel = 'M';
  } else if (sway >= 1e3) {
    scale = 1e3;
    unitLabel = 'k';
  } else {
    scale = 1;
    unitLabel = '';
  }

  const workingUnits = (sway / scale);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      fixedPlaces++;
    }
  }
  return `${formatFixed(workingUnits, fixedPlaces)}${unitLabel}`;
};

export const keyify = (str) => (str || '').replace(/[^a-zA-Z0-9_]/g, '');

// TODO: both buildingRecipes and buildingDescriptions should be in SDK
export const buildingRecipes = [
  [],
  [[700, 5, 700], [700, 19, 500], [400, 22, 0]],
];

export const buildingDescriptions = [
  `The microgravity environment of asteroids affects the physical
    condition of asteroid material; for example, a bed of regolith will settle
    and become more compacted than would be found on an asteroid.`,
  `The Warehouse provides inventory space to store items: raw
    materials, refined materials, process modules, or finished goods.`,
  `The Extractor is responsible for extracting the raw materials from an
    asteroid. They are tied closely to the core sampling process, and rely
    on the availability of a core sample to be able to operate efficiently.`,
  `The Refinery allows for the refining of raw materials into their
    constituent refined materials. Effectively they are responsible for
    all intermediate and un-finished goods. They utilize process modules
    to modify the targeted output which defines the recipe, and therefore
    required inputs.`,
  `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
    tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
    consequat.`,  // TODO: farm
  `All finished goods, except for ships, are produced in the Factory based
    on their installed assembly process modules. The finished goods produced
    in Factories are primarily consumables, or serve to be assembled as new
    buildings, or new ships.`,
  `The Shipyard is a specialized Factory that are required for the final
    construction and deconstruction of ships.`,
  `The Spaceport allows for the landing of all ship classes on an asteroid's
    surface, not just those capable of performing all-terrain landings like
    the Light Transport. Spaceports provide for unlimited space to land ships
    and the only facilities on the asteroid capable of loading and unloading
    those ships. Although they have unlimited space, landing is subject to a
    queue with one landing occurring every 4 Adalian hours (10 real minutes).`,
  `The Marketplace serves as the central point of the Adalian economy. Once
    they are built on an asteroid they allow for the exchange of all local
    raw materials, refined materials, process modules, and finished goods.
    Items are placed on the Marketplace by the seller, and once purchased by
    the buyer generate fees that accrue to the owner of the Marketplace. The
    Marketplace owner is further able to provide incentives to sellers to
    encourage their use of a particular Marketplace. Buyers are able to access
    a single, asteroid-wide market interface displaying items for sale, but
    any explicit buy-orders must be placed at a specific Marketplace.`,
  `The Habitat is the only location which allows recruiting of new Crewmates
    and is required to support any Hab Modules not attached to ships.
    Additionally, Habitats are required for the storage of inactive crew, and
    therefore grant the ability to switch out / modify crew loadouts. Finally,
    active crew can be stationed at Habitats resulting in a bonus to their
    Food consumption rate vs. crew stationed on their ship at Spaceports or in
    flight. Although there are no limits on the number of Crewmates stationed
    at a Habitat, the Food consumption bonus diminishes when Habitats become
    overcrowded and ultimately disappears as the level of overcrowding increases.`
];