import esb from 'elastic-builder';
import { Crew, Entity, Lot, Permission, Processor, Time } from '@influenceth/sdk';
import trim from 'lodash/trim';

import { BioreactorBuildingIcon, ManufactureIcon, RefineIcon } from '~/components/Icons';

const timerIncrements = { d: 86400, h: 3600, m: 60, s: 1 };
export const formatTimer = (secondsRemaining, maxPrecision = null) => {
  if (isNaN(secondsRemaining)) return '';
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

export const formatPrice = (inputSway, { minPrecision = 3, fixedPrecision = 4, forcedAbbrev } = {}) => {
  let sign = inputSway < 0 ? '-' : '';

  const sway = Math.abs(inputSway);
  let unitLabel;
  let scale;
  if ((sway >= 1e6 && forcedAbbrev === undefined) || forcedAbbrev === 6) {
    scale = 1e6;
    unitLabel = 'M';
  } else if ((sway >= 1e3 && forcedAbbrev === undefined) || forcedAbbrev === 3) {
    scale = 1e3;
    unitLabel = 'k';
  } else if ((sway >= 1 && forcedAbbrev === undefined) || forcedAbbrev === 0) {
    scale = 1;
    unitLabel = '';
  } else {
    return Number(sway || 0).toLocaleString(undefined, { minimumFractionDigits: minPrecision, maximumFractionDigits: fixedPrecision });
  }

  const workingUnits = (sway / scale);

  let fixedPlaces = fixedPrecision || 0;
  if (fixedPrecision === undefined) {
    while (workingUnits * 10 ** (fixedPlaces + 1) < 10 ** minPrecision) {
      fixedPlaces++;
    }
  }
  return `${sign}${(workingUnits || 0).toLocaleString(undefined, { minimumFractionDigits: minPrecision, maximumFractionDigits: fixedPlaces })}${unitLabel}`;
};

export const keyify = (str) => (str || '').replace(/[^a-zA-Z0-9_]/g, '');

export const reactBool = (value) => value ? 'true' : undefined;
export const nativeBool = (value) => Boolean(value);

export const reactPreline = (value, maxInARow = 2) => {
  return (value || '')
    .split('\n')
    .map((line) => trim(line))
    .filter((c, i, arr) => {
      if (c.length) return true;
      if (i < maxInARow) return true;
      
      // this line is blank... make sure it is not creating > maxInARow
      for (let j = 1; j <= maxInARow - 1; j++) {
        if (arr[i - j].length > 0) return true;
      }
      return false;
    })
    .map((line, i) => i > 0 ? [<br key={i} />, line] : line)
};

export const locationsArrToObj = (locations) => {
  const asteroidId = locations.find((l) => Number(l.label) === Entity.IDS.ASTEROID)?.id;
  const lotLocation = locations.find((l) => l.label === Entity.IDS.LOT);
  return {
    asteroidId,
    lotId: lotLocation?.id,
    lotIndex: lotLocation?.id ? Lot.toIndex(lotLocation?.id) : (asteroidId ? 0 : undefined),
    buildingId: locations.find((l) => l.label === Entity.IDS.BUILDING)?.id,
    shipId: locations.find((l) => l.label === Entity.IDS.SHIP)?.id,
    spaceId: locations.find((l) => l.label === Entity.IDS.SPACE)?.id,
  }
};

export const andList = (items) => {
  if (items.length <= 1) return <>{items}</>;
  if (items.length === 2) return <>{items[0]} and {items[1]}</>;
  return <>{items.slice(0, -1).map((i) => <>{i}, </>)} and {items[items.length - 1]}</>;
}

export const ucfirst = (str) => {
  if (!str) return str;
  const s = (str || '').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1)
};

export const getCrewAbilityBonuses = (abilityIdOrAbilityIds, crew) => {
  if (!crew) return {};
  const isMultiple = Array.isArray(abilityIdOrAbilityIds);
  const timeSinceFed = Math.max(
    0,
    Time.toGameDuration(
      (crew._now || (Date.now() / 1000)) - (crew.Crew?.lastFed || 0),
      crew._timeAcceleration
    )
  );
  const bonuses = (isMultiple ? abilityIdOrAbilityIds : [abilityIdOrAbilityIds]).reduce((acc, abilityId) => {
    acc[abilityId] = Crew.getAbilityBonus(abilityId, crew._crewmates, crew._station, timeSinceFed);
    return acc;
  }, {});
  return isMultiple ? bonuses : bonuses[abilityIdOrAbilityIds];
}

export const esbLocationQuery = ({ asteroidId, lotId }, path = 'Location.locations') => {
  let label, id;
  if (asteroidId) {
    label = Entity.IDS.ASTEROID;
    id = asteroidId;
  } else if (lotId) {
    label = Entity.IDS.LOT;
    id = lotId;
  }
  if (!label || !id) return undefined;

  return esb.nestedQuery()
    .path(path)
    .query(
      esb.boolQuery().must([
        esb.termQuery(`${path}.label`, label),
        esb.termQuery(`${path}.id`, id),
      ])
    )
};

export const esbPermissionQuery = (crewId, crewDelegatedTo, permissionId) => {
  return esb.boolQuery().should([
    esb.termQuery('Control.controller.id', crewId),
    esb.nestedQuery()
      .path('PublicPolicies')
      .query(esb.termQuery('PublicPolicies.permission', permissionId)),
    esb.nestedQuery()
      .path('PrepaidAgreements')
      .query(
        esb.boolQuery().must([
          esb.termQuery('PrepaidAgreements.permission', permissionId),
          esb.termQuery('PrepaidAgreements.permitted.id', crewId),
        ])
      ),
    esb.nestedQuery()
      .path('ContractAgreements')
      .query(
        esb.boolQuery().must([
          esb.termQuery('ContractAgreements.permission', permissionId),
          esb.termQuery('ContractAgreements.permitted.id', crewId),
        ])
      ),
    esb.nestedQuery()
      .path('WhitelistAgreements')
      .query(
        esb.boolQuery().must([
          esb.termQuery('WhitelistAgreements.permission', permissionId),
          esb.termQuery('WhitelistAgreements.permitted.id', crewId),
        ])
      ),
    esb.nestedQuery()
      .path('WhitelistAccountAgreements')
      .query(
        esb.boolQuery().must([
          esb.termQuery('WhitelistAccountAgreements.permission', permissionId),
          esb.termQuery('WhitelistAccountAgreements.permitted', crewDelegatedTo),
        ])
      )
  ])
};

export const getProcessorProps = (processorType) => {
  switch (processorType) {
    case Processor.IDS.REFINERY: return { label: 'Refine Material', icon: <RefineIcon /> };
    case Processor.IDS.FACTORY: return { label: 'Manufacture Goods', icon: <ManufactureIcon /> };
    case Processor.IDS.BIOREACTOR: return { label: 'Manufacture Organic Goods', icon: <BioreactorBuildingIcon /> };
    case Processor.IDS.SHIPYARD: return { label: 'Manufacture Ship Parts', icon: <ManufactureIcon /> };
    default: return {};
  }
}

export const arrToXYZ = (arr) => ({ x: arr[0], y: arr[1], z: arr[2] });

const yearOfSeconds = 31536000;
export const secondsToMonths = (seconds) => Math.floor(1000 * 12 * seconds / yearOfSeconds) / 1000;
export const monthsToSeconds = (months) => Math.floor(yearOfSeconds * months / 12);
export const secondsToDays = (seconds) => formatFixed(seconds / 86400, 2);
export const daysToSeconds = (days) => days * 86400;

export const getBlockTime = async (starknet, blockNumber = 'pending') => {
  try {
    const block = await starknet.provider.getBlock(blockNumber > 0 ? blockNumber : 'pending');
    // console.log('block', block);
    return block?.timestamp;
  } catch (e) {
    console.error(e);
  }
}

export const safeEntityId = (variablyHydratedEntity) => {
  if (variablyHydratedEntity) {
    const e = {
      id: variablyHydratedEntity?.id,
      label: variablyHydratedEntity?.label,
      uuid: variablyHydratedEntity?.uuid
    };
    if (e.id && e.label && !e.uuid) {
      e.uuid = Entity.packEntity(e);
    }
    return e;
  }
  return undefined;
};

export const getAgreementPath = (target, permission, permitted) => {
  return `${target ? Entity.packEntity(target) : ''}.${permission || ''}.${permitted?.id ? Entity.packEntity(permitted) : (permitted || '')}`;
};

export const entityToAgreements = (entity) => {
  const acc = [];
  ['PrepaidAgreements', 'ContractAgreements', 'WhitelistAgreements', 'WhitelistAccountAgreements'].forEach((agreementType) => {
    (entity[agreementType] || []).forEach((agreement, j) => {
      const formatted = {
        ...entity,
        
        key: `${entity.uuid}_${agreementType}_${j}`,
        _agreement: {
          _path: getAgreementPath(entity, agreement.permission, agreement.permitted),
          _type: agreementType === 'PrepaidAgreements'
            ? Permission.POLICY_IDS.PREPAID
            : (agreementType === 'ContractAgreements' ? Permission.POLICY_IDS.CONTRACT : 5),
          ...agreement
        },
      };
      // for the sake of agreements, the lot controller is *always* the asteroid controller
      // because that is who is the administrator of lot agreements
      // NOTE: this is different from elsewhere in the client, where the controller is
      //       whoever has LOT_USE (fallback to asteroid controller)
      formatted.Control = entity.label === Entity.IDS.LOT ? entity.meta?.asteroid?.Control : entity.Control;
      acc.push(formatted);
    })
  });
  return acc;
};

export const cleanseTxHash = function (txHash) {
  if (!txHash) return null;
  return `0x${BigInt(txHash).toString(16).padStart(64, '0')}`;
};

export const earlyAccessJSTime = 1708527600e3;
export const openAccessJSTime = 1709046000e3;
export const displayTimeFractionDigits = 2;
export const maxAnnotationLength = 750;