import { Fragment, useMemo } from 'react';
import styled from 'styled-components';
import { Building, Inventory } from '@influenceth/sdk';

import { useLotLink } from '~/components/LotLink';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Rule, majorBorderColor } from './components';
import ClipCorner from '~/components/ClipCorner';
import { CaretIcon, ConstructIcon } from '~/components/Icons';
import { formatFixed } from '~/lib/utils';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import { ShipImage } from '../actionDialogs/components';
import { ResourceImage } from '~/components/ResourceThumbnail';
import { useShipAssets } from '~/hooks/useAssets';
import useLot from '~/hooks/useLot';
import { useShipLink } from '~/components/ShipLink';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const AssetTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const HoverContent = styled.span`
  display: none;
`;
const NotHoverContent = styled.span`
  font-weight: bold;
`;

const LotRow = styled.tr`
  cursor: ${p => p.theme.cursors.active};
  & > * {
    padding: 4px 4px;
  }
  &:hover {
    ${HoverContent} {
      display: inline;
    }
    ${NotHoverContent} {
      display: none;
    }
    & > td {
      background: rgba(255, 255, 255, 0.05);
    }
  }
`;

const ShipHeaderRow = styled.tr`
  border-bottom: 1px solid #333;
  font-size: 14px;
  th, td {
    padding: 2px 0 6px;
  }
  th {
    text-align: left;
  }
  td {
    color: #777;
    text-align: right;
  }
`;
const ShipRow = styled(LotRow)`
  & > * {
    color: #777;
    font-size: 14px;
    vertical-align: middle;
    &:last-child {
      color: white;
      text-align: right;
    }
  }
`;
const ImageCell = styled.td`
  padding-left: 2px;
  width: 40px;
`;
const InfoCell = styled.td`
  padding-right: 2px;
  vertical-align: top;
`;

const ImageWrapper = styled.div`
  align-items: center;
  background: black;
  border: 1px solid #222;
  clip-path: polygon(
    0 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%
  );
  display: flex;
  font-size: 22px;
  height: 36px;
  justify-content: center;
  position: relative;
  width: 36px;
`;

const Details = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  font-size: 14px;
  justify-content: space-between;
  margin-top: 1px;
  & label {
    color: #777;
  }
`;

// TODO: progress should be an attribute, or else each of these creates a new class every second
const Bar = styled.div`
  background: ${majorBorderColor};
  border-radius: 3px;
  position: relative;
  height: 3px;
  margin-top: 6px;
  width: 100%;
  &:before {
    content: '';
    background: ${p => {
      const color = p.progressColor || 'main';
      return p.theme.colors[p.progress === 1 && color === 'main' ? 'success' : color];
    }};
    border-radius: 3px;
    position: absolute;
    height: 100%;
    left: 0;
    top: 0;
    transition: width 1000ms linear;
    width: ${p => 100 * p.progress}%;
  }
`;

const Status = styled.td`
  color: ${p => {
    if (p.status === 'Extracting') return p.theme.colors.success;
    else if (p.status === 'Ready') return p.theme.colors.main;
    else if (p.status === 'At Risk') return 'rgb(248, 133, 44)';
    return '#777';
  }};
  text-align: right;
  text-transform: uppercase;
  white-space: nowrap;
`;

const BuildingRow = ({ lot }) => {
  const chainTime = useChainTime();
  const onClick = useLotLink({
    asteroidId: lot.asteroid,
    lotId: lot.i,
  });

  const [progress, progressColor] = useMemo(() => {
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (lot.building?.capableType === Building.IDS.WAREHOUSE) {
        const inventory = (lot.building.inventories || [0]).find((i) => !i.locked);
        const usage = inventory ? Math.max(
          ((inventory.mass || 0) + (inventory.reservedMass || 0)) / (1e6 * Inventory.TYPES[inventory.inventoryType].mass),
          ((inventory.volume || 0) + (inventory.reservedVolume || 0)) / (1e6 * Inventory.TYPES[inventory.inventoryType].volume),
        ) : 0;
        return [
          Math.min(1, usage),
          'main'
        ];
      }
      if (lot.building?.capableType === Building.IDS.EXTRACTOR) {
        return [
          Math.min(1, (chainTime - lot.building?.extraction?.startTime) / (lot.building?.extraction?.completionTime - lot.building?.extraction?.startTime)),
          'main'
        ];
      }
    }
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
      return [
        Math.min(1, 1 - (lot.gracePeriodEnd - chainTime) / Building.GRACE_PERIOD),
        'error'
      ];
    }
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
      return [
        Math.min(1, (chainTime - lot.building?.construction?.startTime) / (lot.building?.construction?.completionTime - lot.building?.construction?.startTime)),
        'main'
      ];
    }
    return [0];
  }, [chainTime, lot.building]);

  const status = useMemo(() => {
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (lot.building?.capableType === 2 && lot.building?.extraction?.status > 0) {
        return 'Extracting';
      } else if (lot.building?.capableType === 1) {
        return `${formatFixed(100 * progress, 1)}% Full`
      }
      return 'Idle';
    }
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.PLANNED && lot.gracePeriodEnd < chainTime) {
      return 'At Risk';
    }
    return Building.CONSTRUCTION_STATUSES[lot.building?.construction?.status || 0];
  }, [lot.building, progress]);

  return (
    <LotRow onClick={onClick}>
      <ImageCell>
        <ImageWrapper>
          <ConstructIcon />
          <ClipCorner color="#222" dimension={8} />
        </ImageWrapper>
      </ImageCell>
      <InfoCell>
        <Details>
          <label>
            {Building.TYPES[lot.building?.capableType || 0].name}
          </label>
          <span>
            <HoverContent>Lot {(lot.i || '').toLocaleString()}</HoverContent>
            <NotHoverContent>{status}</NotHoverContent>
          </span>
        </Details>
        <Bar progress={progress} progressColor={progressColor} />
      </InfoCell>
    </LotRow>
  );
};

const ShipGroupHeader = ({ asteroidId, lotId }) => {
  const { data: lot } = useLot(asteroidId, lotId);

  const mainLabel = useMemo(() => {
    return lotId > 0 ? (lot?.building?.__t || 'Empty Lot') : 'In Orbit';
  }, [lot, lotId]);
  
  const details = useMemo(() => {
    return lotId > 0 ? `Lot ${lotId.toLocaleString()}` : '';
  }, [lotId]);

  return (
    <ShipHeaderRow>
      <th colspan="2" style={{  }}><CaretIcon /> {mainLabel}</th>
      <td style={{  }}>{details}</td>
    </ShipHeaderRow>
  );
};

const ShipInfoRow = ({ asset, ship }) => {
  const onClick = useShipLink({ shipId: ship?.i, zoomToShip: true });

  return (
    <ShipRow onClick={onClick}>
      <ImageCell>
        <ImageWrapper>
          <ResourceImage src={asset.iconUrls?.w150} style={{ width: 32, backgroundSize: 'contain' }} />
          <ClipCorner color="#222" dimension={8} />
        </ImageWrapper>
      </ImageCell>
      <td>
        {ship.name}
      </td>
      <td>
        {asset.name}
      </td>
    </ShipRow>
  );
};

const AsteroidAssets = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lots, isLoading: lotsLoading } = useAsteroidCrewLots(asteroidId);
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);
  const shipAssets = useShipAssets();

  const buildingTally = lots?.length || 0;

  const buildingsByType = useMemo(() => {
    if (!lots) return {};
    return lots
    .sort((a, b) => a.building?.__t < b.building?.__t ? -1 : 1)
    .reduce((acc, lot) => {
      const capableType = lot.building?.capableType;
      if (!acc[capableType]) acc[capableType] = [];
      acc[capableType].push(lot);
      return acc;
    }, {});
  }, [lots]);

  const shipsByLocation = useMemo(() => {
    if (!ships) return {};
    return ships
    .reduce((acc, ship) => {
      const lot = ship.lotId || -1;
      if (!acc[lot]) acc[lot] = [];
      acc[lot].push(ship);
      return acc;
    }, {});
  }, [ships]);

  return (
    <Wrapper>
      <HudMenuCollapsibleSection
        titleText="Buildings"
        titleLabel={`${buildingTally.toLocaleString()} Asset${buildingTally === 1 ? '' : 's'}`}>
        {asteroid && lots && !lotsLoading && (
          <>
            {buildingTally === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied any lots on this asteroid yet.</div>}
            {buildingTally > 0 && Object.keys(buildingsByType).map((capableType, i) => (
              <Fragment key={capableType}>
                {i > 0 && <Rule />}
                <AssetTable>
                  <tbody>
                    {buildingsByType[capableType].map((lot) => <BuildingRow key={lot.i} lot={lot} />)}
                  </tbody>
                </AssetTable>
              </Fragment>
            ))}
          </>
        )}
      </HudMenuCollapsibleSection>
      
      <HudMenuCollapsibleSection
        titleText="Ships"
        titleLabel={`${ships?.length || 0} Asset${ships?.length === 1 ? '' : 's'}`}
        collapsed>
        {asteroid && ships && !shipsLoading && (
          <>
            {!ships?.length && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has no ships landed on or orbiting this asteroid yet.</div>}
            {ships?.length > 0 && Object.keys(shipsByLocation).map((lotId, i) => (
              <Fragment key={lotId}>
                <AssetTable style={i > 0 ? { marginTop: 10 } : {}}>
                  <thead>
                    <ShipGroupHeader asteroidId={asteroidId} lotId={lotId} />
                  </thead>
                  <tbody>
                    {shipsByLocation[lotId].map((ship) => <ShipInfoRow key={ship.i} ship={ship} asset={shipAssets[ship.type]} />)}
                  </tbody>
                </AssetTable>
              </Fragment>
            ))}
          </>
        )}
      </HudMenuCollapsibleSection>

      <HudMenuCollapsibleSection
        titleText="Stationed Crewmates"
        titleLabel="0 Assets"
        collapsed
        borderless>
        <></>
      </HudMenuCollapsibleSection>
    </Wrapper>
  );
};

export default AsteroidAssets;