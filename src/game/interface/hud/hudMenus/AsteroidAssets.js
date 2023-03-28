import { Fragment, useMemo } from 'react';
import styled from 'styled-components';
import { Capable, Construction, Inventory, Lot } from '@influenceth/sdk';

import { useLotLink } from '~/components/LotLink';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Rule, majorBorderColor } from './components';
import ClipCorner from '~/components/ClipCorner';
import { ConstructIcon } from '~/components/Icons';
import { formatFixed } from '~/lib/utils';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const LotTable = styled.table`
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
const BuildingCell = styled.td`
  padding-left: 2px;
  width: 40px;
`;
const InfoCell = styled.td`
  padding-right: 2px;
  vertical-align: top;
`;

const Building = styled.div`
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
    if (lot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (lot.building?.capableType === 2 && lot.building?.extraction?.status > 0) {
        return [
          Math.min(1, (chainTime - lot.building?.extraction?.startTime) / (lot.building?.extraction?.completionTime - lot.building?.extraction?.startTime)),
          'main'
        ];
      } else if (lot.building?.capableType === 1) {
        const usage = lot.building.inventories ? Math.max(
          ((lot.building.inventories[1].mass || 0) + (lot.building.inventories[1].reservedMass || 0)) / (1e6 * Inventory.CAPACITIES[1][1].mass),
          ((lot.building.inventories[1].volume || 0) + (lot.building.inventories[1].reservedVolume || 0)) / (1e6 * Inventory.CAPACITIES[1][1].volume),
        ) : 0;
        return [
          Math.min(1, usage),
          'main'
        ];
      }
    }
    if (lot.building?.construction?.status === Construction.STATUS_PLANNED) {
      return [
        Math.min(1, 1 - (lot.gracePeriodEnd - chainTime) / Lot.GRACE_PERIOD),
        'error'
      ];
    }
    if (lot.building?.construction?.status === Construction.STATUS_UNDER_CONSTRUCTION) {
      return [
        Math.min(1, (chainTime - lot.building?.construction?.startTime) / (lot.building?.construction?.completionTime - lot.building?.construction?.startTime)),
        'main'
      ];
    }
    return [0];
  }, [chainTime, lot.building]);

  const status = useMemo(() => {
    if (lot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (lot.building?.capableType === 2 && lot.building?.extraction?.status > 0) {
        return 'Extracting';
      } else if (lot.building?.capableType === 1) {
        return `${formatFixed(100 * progress, 1)}% Full`
      }
      return 'Idle';
    }
    if (lot.building?.construction?.status === Construction.STATUS_PLANNED && lot.gracePeriodEnd < chainTime) {
      return 'At Risk';
    }
    return Construction.STATUSES[lot.building?.construction?.status || 0];
  }, [lot.building, progress]);

  return (
    <LotRow onClick={onClick}>
      <BuildingCell>
        <Building>
          <ConstructIcon />
          <ClipCorner color="#222" dimension={8} />
        </Building>
      </BuildingCell>
      <InfoCell>
        <Details>
          <label>
            {Capable.TYPES[lot.building?.capableType || 0].name}
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

const AsteroidAssets = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: lots, isLoading } = useAsteroidCrewLots(asteroidId);

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

  return (
    <Wrapper>
      <HudMenuCollapsibleSection
        titleText="Buildings"
        titleLabel={`${buildingTally.toLocaleString()} Asset${buildingTally === 1 ? '' : 's'}`}>
        {asteroid && lots && !isLoading && (
          <>
            {buildingTally === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied any lots on this asteroid yet.</div>}
            {buildingTally > 0 && Object.keys(buildingsByType).map((capableType, i) => (
              <Fragment key={capableType}>
                {i > 0 && <Rule />}
                <LotTable>
                  <tbody>
                    {buildingsByType[capableType].map((lot) => <BuildingRow key={lot.i} lot={lot} />)}
                  </tbody>
                </LotTable>
              </Fragment>
            ))}
          </>
        )}
      </HudMenuCollapsibleSection>
      
      <HudMenuCollapsibleSection
        titleText="Ships"
        titleLabel="0 Assets"
        collapsed>
        <></>
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