import { Fragment, useMemo } from 'react';
import styled from 'styled-components';
import { Building, Dock, Entity, Inventory, Ship, Station } from '@influenceth/sdk';

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
import { ResourceImage } from '~/components/ResourceThumbnail';
import useLot from '~/hooks/useLot';
import { useShipLink } from '~/components/ShipLink';
import { getShipIcon } from '~/lib/assetUtils';
import useBuilding from '~/hooks/useBuilding';
import useCrewContext from '~/hooks/useCrewContext';

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
  ${p => p.theme.clipCorner(8)};
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
    if (lot.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (lot.building?.Building?.buildingType === Building.IDS.WAREHOUSE) {
        const inventory = (lot.building.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE);
        const filledCapacity = Inventory.getFilledCapacity(inventory?.inventoryType);
        const usage = inventory
          ? Math.min(1,
            Math.max(
              ((inventory.mass || 0) + (inventory.reservedMass || 0)) / filledCapacity.filledMass,
              ((inventory.volume || 0) + (inventory.reservedVolume || 0)) / filledCapacity.filledVolume,
            )
          )
          : 0;
        return [usage, usage < 0.75 ? 'main' : (usage < 0.9 ? 'warning' : 'error')];
      }

      // TODO: ecs refactor -- must get startTime, finishTime from action items for all the following
      // TODO: should have multiple bars for multiple processes / inventories
      // TODO: anything to show for marketplace?
      // TODO: how do drydocks work at shipyard?

      if (lot.building?.Building?.buildingType === Building.IDS.SPACEPORT) {
        const usage = Math.min(1, lot.building.Dock.dockedShips / Dock.TYPES[lot.building.Dock.dockType].cap);
        return [usage, usage < 0.75 ? 'main' : (usage < 0.9 ? 'warning' : 'error')];
      }
      else if (lot.building?.Building?.buildingType === Building.IDS.HABITAT) {
        const usage = Math.min(1, lot.building.Station.population / Station.TYPES[lot.building.Station.stationType].cap);
        return [usage, usage < 0.75 ? 'main' : (usage < 0.9 ? 'warning' : 'error')];
      }

      else if (lot.building?.Building?.buildingType === Building.IDS.EXTRACTOR) {
        return [
          Math.min(1, (chainTime - lot.building?.Extractors?.[0]?.startTime) / (lot.building?.Extractors?.[0]?.finishTime - lot.building?.Extractors?.[0]?.startTime)),
          'main'
        ];
      }
      else if (lot.building?.Processors?.length) {
        return [
          Math.min(1, (chainTime - lot.building?.Processors?.[0]?.startTime) / (lot.building?.Processors?.[0]?.finishTime - lot.building?.Processors?.[0]?.startTime)),
          'main'
        ];
      }
    }

    if (lot.building?.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
      return [
        Math.min(1, 1 - (lot.building?.Building?.plannedAt + Building.GRACE_PERIOD - chainTime) / Building.GRACE_PERIOD),
        'error'
      ];
    }

    if (lot.building?.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
      return [
        Math.min(1, (chainTime - lot.building?.Building?.startTime) / (lot.building?.Building?.finishTime - lot.building?.Building?.startTime)),
        'main'
      ];
    }
    return [0];
  }, [chainTime, lot.building]);

  const status = useMemo(() => {
    if (lot.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (lot.building?.Building?.buildingType === Building.IDS.EXTRACTOR && lot.building?.Extractors?.[0]?.status > 0) {
        return 'Extracting';

      } else if (lot.building?.Processors?.length && lot.building?.Processors?.[0]?.status > 0) {
        return 'Processing';

      } else if ([Building.IDS.WAREHOUSE, Building.IDS.SPACEPORT, Building.IDS.HABITAT].includes(lot.building?.Building?.buildingType)) {
        return `${formatFixed(100 * progress, 1)}% Full`
      }
      return 'Idle';
    }
    if (lot.building?.construction?.status === Building.CONSTRUCTION_STATUSES.PLANNED && lot.building?.Building?.plannedAt + Building.GRACE_PERIOD < chainTime) {
      return 'At Risk';
    }
    return Building.CONSTRUCTION_STATUSES[lot.building?.Building?.status || 0];
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
            {lot.building?.Name?.name || Building.TYPES[lot.building?.Building?.buildingType || 0].name}
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

const ShipGroupHeader = ({ asteroidId, buildingId, lotId }) => {
  const { data: building } = useBuilding(buildingId);
  const buildingLoc = Entity.toPosition(building?.Location?.location);

  const { data: lot } = useLot(asteroidId, buildingLoc?.lotId || lotId);

  const [mainLabel, details] = useMemo(() => {
    if (lotId === 0) return ['In Orbit', ''];
    return [
      Building.TYPES[lot?.building?.Building?.buildingType]?.name || 'Empty Lot',
      `Lot ${lot?.i.toLocaleString()}`
    ]
  }, [lot, lotId]);

  return (
    <ShipHeaderRow>
      <th colspan="2" style={{  }}><CaretIcon /> {mainLabel}</th>
      <td style={{  }}>{details}</td>
    </ShipHeaderRow>
  );
};

const ShipInfoRow = ({ ship }) => {
  const onClick = useShipLink({ shipId: ship.i, zoomToShip: true });

  return (
    <ShipRow onClick={onClick}>
      <ImageCell>
        <ImageWrapper>
          <ResourceImage src={getShipIcon(ship.Ship.shipType, 'w150')} style={{ width: 32, backgroundSize: 'contain' }} />
          <ClipCorner color="#222" dimension={8} />
        </ImageWrapper>
      </ImageCell>
      <td>
        {ship.Name?.name || `Ship #${ship.i.toLocaleString()}`}
      </td>
      <td>
        {Ship.TYPES[ship.Ship.shipType].name}
      </td>
    </ShipRow>
  );
};

const AsteroidAssets = () => {
  const { crew } = useCrewContext();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lots, isLoading: lotsLoading } = useAsteroidCrewLots(asteroidId);
  // TODO: ecs refactor -- should this use useOwnedShips instead (and filter to asteroid location?);
  //  might be harder todo unless also using elasticsearch for flattened location
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);

  const buildingTally = lots?.length || 0;

  const buildingsByType = useMemo(() => {
    if (!lots) return {};
    return lots
    .sort((a, b) => Building.TYPES[a.building?.Building?.buildingType]?.name < Building.TYPES[b.building?.Building?.buildingType]?.name ? -1 : 1)
    .reduce((acc, lot) => {
      const buildingType = lot.building?.Building?.buildingType;
      if (!acc[buildingType]) acc[buildingType] = [];
      acc[buildingType].push(lot);
      return acc;
    }, {});
  }, [lots]);

  const shipsByLocation = useMemo(() => {
    if (!ships) return {};
    return ships
    .reduce((acc, ship) => {
      if (ship.Control?.controller?.id === crew?.i) {
        const loc = ship.Location.location;
        const lot = loc.label === Entity.IDS.LOT ? (loc.id || 0) : -loc.id;
        if (!acc[lot]) acc[lot] = [];
        acc[lot].push(ship);
      }
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
            {buildingTally > 0 && Object.keys(buildingsByType).map((buildingType, i) => (
              <Fragment key={buildingType}>
                {i > 0 && <Rule />}
                <AssetTable>
                  <tbody>
                    {buildingsByType[buildingType].map((lot) => <BuildingRow key={lot.i} lot={lot} />)}
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
            {ships?.length > 0 && Object.keys(shipsByLocation).map((lotOrBuildingId, i) => {
              const headerProps = { asteroidId };
              if (lotOrBuildingId > 0) headerProps.lotId = lotOrBuildingId;
              else if (lotOrBuildingId < 0) headerProps.buildingId = -lotOrBuildingId;

              return (
                <Fragment key={lotOrBuildingId}>
                  <AssetTable style={i > 0 ? { marginTop: 10 } : {}}>
                    <thead>
                      <ShipGroupHeader {...headerProps} />
                    </thead>
                    <tbody>
                      {shipsByLocation[lotOrBuildingId].map((ship) => <ShipInfoRow key={ship.i} ship={ship} />)}
                    </tbody>
                  </AssetTable>
                </Fragment>
              );
            })}
          </>
        )}
      </HudMenuCollapsibleSection>

      {/* TODO: ? */}
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