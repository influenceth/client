import { Fragment, useMemo } from 'react';
import styled from 'styled-components';
import { Building, Dock, Entity, Inventory, Lot, Ship, Station } from '@influenceth/sdk';

import { useLotLink } from '~/components/LotLink';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidCrewBuildings from '~/hooks/useAsteroidCrewBuildings';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Rule, majorBorderColor } from './components';
import ClipCorner from '~/components/ClipCorner';
import { CaretIcon, ConstructIcon } from '~/components/Icons';
import { formatFixed, locationsArrToObj } from '~/lib/utils';
import useAsteroidShips from '~/hooks/useAsteroidShips';
import { ResourceImage } from '~/components/ResourceThumbnail';
import useLot from '~/hooks/useLot';
import { useShipLink } from '~/components/ShipLink';
import { getShipIcon } from '~/lib/assetUtils';
import useBuilding from '~/hooks/useBuilding';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';
import useEntity from '~/hooks/useEntity';

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
const BarWrapper = styled.div`
  background: ${majorBorderColor};
  border-radius: 3px;
  position: relative;
  height: 3px;
  margin-top: 6px;
  width: 100%;
`;
const Bar = styled.div.attrs((p) => {
  const progressColor = p.progressColor || 'main';
  const background = p.theme.colors[p.progress === 1 && progressColor === 'main' ? 'success' : progressColor];
  return {
    style: {
      background,
      width: `${100 * p.progress}%`,
    }
  }
})`
  border-radius: 3px;
  position: absolute;
  height: 100%;
  left: 0;
  top: 0;
  transition: width 1000ms linear;
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

const BuildingRow = ({ building }) => {
  const chainTime = useChainTime();
  const buildingLoc = locationsArrToObj(building?.Location?.locations);
  const onClick = useLotLink(buildingLoc);

  const [progress, progressColor] = useMemo(() => {
    if (building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (building?.Building?.buildingType === Building.IDS.WAREHOUSE) {
        const inventory = (building.Inventories || []).find((i) => i.status === Inventory.STATUSES.AVAILABLE);
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

      if (building?.Building?.buildingType === Building.IDS.SPACEPORT) {
        const usage = Math.min(1, building.Dock.dockedShips / Dock.TYPES[building.Dock.dockType].cap);
        return [usage, usage < 0.75 ? 'main' : (usage < 0.9 ? 'warning' : 'error')];
      }
      else if (building?.Building?.buildingType === Building.IDS.HABITAT) {
        const usage = Math.min(1, building.Station.population / Station.TYPES[building.Station.stationType].cap);
        return [usage, usage < 0.75 ? 'main' : (usage < 0.9 ? 'warning' : 'error')];
      }

      else if (building?.Building?.buildingType === Building.IDS.EXTRACTOR) {
        return [
          Math.min(1, (chainTime - building?.Extractors?.[0]?.startTime) / (building?.Extractors?.[0]?.finishTime - building?.Extractors?.[0]?.startTime)),
          'main'
        ];
      }
      else if (building?.Processors?.length) {
        return [
          Math.min(1, (chainTime - building?.Processors?.[0]?.startTime) / (building?.Processors?.[0]?.finishTime - building?.Processors?.[0]?.startTime)),
          'main'
        ];
      }
    }

    if (building?.Building?.status === Building.CONSTRUCTION_STATUSES.PLANNED) {
      return [
        Math.min(1, 1 - (building?.Building?.plannedAt + Building.GRACE_PERIOD - chainTime) / Building.GRACE_PERIOD),
        'error'
      ];
    }

    if (building?.Building?.status === Building.CONSTRUCTION_STATUSES.UNDER_CONSTRUCTION) {
      return [
        Math.min(1, (chainTime - building?.Building?.startTime) / (building?.Building?.finishTime - building?.Building?.startTime)),
        'main'
      ];
    }
    return [0];
  }, [chainTime, building]);

  const status = useMemo(() => {
    if (building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL) {
      if (building?.Building?.buildingType === Building.IDS.EXTRACTOR && building?.Extractors?.[0]?.status > 0) {
        return 'Extracting';

      } else if (building?.Processors?.length && building?.Processors?.[0]?.status > 0) {
        return 'Processing';

      } else if ([Building.IDS.WAREHOUSE, Building.IDS.SPACEPORT, Building.IDS.HABITAT].includes(building?.Building?.buildingType)) {
        return `${formatFixed(100 * progress, 1)}% Full`
      }
      return 'Idle';
    }
    if (building?.construction?.status === Building.CONSTRUCTION_STATUSES.PLANNED && building?.Building?.plannedAt + Building.GRACE_PERIOD < chainTime) {
      return 'At Risk';
    }
    return Building.CONSTRUCTION_STATUSES[building?.Building?.status || 0];
  }, [building, progress]);

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
            {building?.Name?.name || Building.TYPES[building?.Building?.buildingType || 0].name}
          </label>
          <span>
            <HoverContent>{formatters.lotName(buildingLoc?.lotIndex)}</HoverContent>
            <NotHoverContent>{status}</NotHoverContent>
          </span>
        </Details>
        <BarWrapper><Bar progress={progress} progressColor={progressColor} /></BarWrapper>
      </InfoCell>
    </LotRow>
  );
};

const ShipGroupHeader = ({ asteroidId, buildingId, lotId }) => {
  const { data: building } = useBuilding(buildingId);
  const buildingLoc = Entity.toPosition(building?.Location?.location);

  const { data: lot } = useLot(buildingLoc?.lotId || lotId);

  const [mainLabel, details] = useMemo(() => {
    if (lotId === 0) return ['In Orbit', ''];
    return [
      Building.TYPES[lot?.building?.Building?.buildingType]?.name || 'Empty Lot',
      `Lot ${Lot.toIndex(buildingLoc?.lotId || lotId).toLocaleString()}`
    ]
  }, [buildingLoc, lot, lotId]);

  return (
    <ShipHeaderRow>
      <th colspan="2" style={{  }}><CaretIcon /> {mainLabel}</th>
      <td style={{  }}>{details}</td>
    </ShipHeaderRow>
  );
};

const ShipInfoRow = ({ ship }) => {
  const onClick = useShipLink({ shipId: ship.id, zoomToShip: true });

  return (
    <ShipRow onClick={onClick}>
      <ImageCell>
        <ImageWrapper>
          <ResourceImage src={getShipIcon(ship.Ship.shipType, 'w150')} style={{ width: 32, backgroundSize: 'contain' }} />
          <ClipCorner color="#222" dimension={8} />
        </ImageWrapper>
      </ImageCell>
      <td>
        {ship.Name?.name || `Ship #${ship.id.toLocaleString()}`}
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
  const { data: buildings, isLoading: buildingsLoading } = useAsteroidCrewBuildings(asteroidId);
  // TODO: ecs refactor -- should this use useOwnedShips instead (and filter to asteroid location?);
  //  might be harder todo unless also using elasticsearch for flattened location
  const { data: ships, isLoading: shipsLoading } = useAsteroidShips(asteroidId);

  const buildingTally = buildings?.length || 0;

  const buildingsByType = useMemo(() => {
    if (!buildings) return {};
    return buildings
    .sort((a, b) => Building.TYPES[a.Building?.buildingType]?.name < Building.TYPES[b.Building?.buildingType]?.name ? -1 : 1)
    .reduce((acc, building) => {
      const buildingType = building.Building?.buildingType;
      if (!acc[buildingType]) acc[buildingType] = [];
      acc[buildingType].push(building);
      return acc;
    }, {});
  }, [buildings]);

  const shipsByLocation = useMemo(() => {
    if (!ships) return {};
    return ships
    .reduce((acc, ship) => {
      if (ship.Control?.controller?.id === crew?.id) {
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
        {asteroid && buildings && !buildingsLoading && (
          <>
            {buildingTally === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied any lots on this asteroid yet.</div>}
            {buildingTally > 0 && Object.keys(buildingsByType).map((buildingType, i) => (
              <Fragment key={buildingType}>
                {i > 0 && <Rule />}
                <AssetTable>
                  <tbody>
                    {buildingsByType[buildingType].map((building) => <BuildingRow key={building.id} building={building} />)}
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
                      {shipsByLocation[lotOrBuildingId].map((ship) => <ShipInfoRow key={ship.id} ship={ship} />)}
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