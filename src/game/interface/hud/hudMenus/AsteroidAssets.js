import { Fragment, useMemo } from 'react';
import styled from 'styled-components';
import { Capable, Construction, Inventory, Lot } from '@influenceth/sdk';

import { usePlotLink } from '~/components/PlotLink';
import useAsteroid from '~/hooks/useAsteroid';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';
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

const SectionWrapper = styled.div`
  overflow: hidden;
  margin-right: -12px;
  padding-right: 12px;
`;

const PlotTable = styled.table`
  border-collapse: collapse;
  width: 100%;
`;

const HoverContent = styled.span`
  display: none;
`;
const NotHoverContent = styled.span`
  font-weight: bold;
`;

const PlotRow = styled.tr`
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

const BuildingRow = ({ plot }) => {
  const chainTime = useChainTime();
  const onClick = usePlotLink({
    asteroidId: plot.asteroid,
    plotId: plot.i,
  });

  const [progress, progressColor] = useMemo(() => {
    if (plot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (plot.building?.capableType === 2 && plot.building?.extraction?.status > 0) {
        return [
          Math.min(1, (chainTime - plot.building?.extraction?.startTime) / (plot.building?.extraction?.completionTime - plot.building?.extraction?.startTime)),
          'main'
        ];
      } else if (plot.building?.capableType === 1) {
        const usage = plot.building.inventories ? Math.max(
          ((plot.building.inventories[1].mass || 0) + (plot.building.inventories[1].reservedMass || 0)) / (1e6 * Inventory.CAPACITIES[1][1].mass),
          ((plot.building.inventories[1].volume || 0) + (plot.building.inventories[1].reservedVolume || 0)) / (1e6 * Inventory.CAPACITIES[1][1].volume),
        ) : 0;
        return [
          Math.min(1, usage),
          'main'
        ];
      }
    }
    if (plot.building?.construction?.status === Construction.STATUS_PLANNED) {
      return [
        Math.min(1, 1 - (plot.gracePeriodEnd - chainTime) / Lot.GRACE_PERIOD),
        'error'
      ];
    }
    if (plot.building?.construction?.status === Construction.STATUS_UNDER_CONSTRUCTION) {
      return [
        Math.min(1, (chainTime - plot.building?.construction?.startTime) / (plot.building?.construction?.completionTime - plot.building?.construction?.startTime)),
        'main'
      ];
    }
    return [0];
  }, [chainTime, plot.building]);

  const status = useMemo(() => {
    if (plot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (plot.building?.capableType === 2 && plot.building?.extraction?.status > 0) {
        return 'Extracting';
      } else if (plot.building?.capableType === 1) {
        return `${formatFixed(100 * progress, 1)}% Full`
      }
      return 'Idle';
    }
    if (plot.building?.construction?.status === Construction.STATUS_PLANNED && plot.gracePeriodEnd < chainTime) {
      return 'At Risk';
    }
    return Construction.STATUSES[plot.building?.construction?.status || 0];
  }, [plot.building, progress]);

  return (
    <PlotRow onClick={onClick}>
      <BuildingCell>
        <Building>
          <ConstructIcon />
          <ClipCorner color="#222" dimension={8} />
        </Building>
      </BuildingCell>
      <InfoCell>
        <Details>
          <label>
            {Capable.TYPES[plot.building?.capableType || 0].name}
          </label>
          <span>
            <HoverContent>Lot {(plot.i || '').toLocaleString()}</HoverContent>
            <NotHoverContent>{status}</NotHoverContent>
          </span>
        </Details>
        <Bar progress={progress} progressColor={progressColor} />
      </InfoCell>
    </PlotRow>
  );
};

const AsteroidAssets = () => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: plots, isLoading } = useAsteroidCrewPlots(asteroidId);

  const buildingTally = plots?.length || 0;

  const buildingsByType = useMemo(() => {
    if (!plots) return {};
    return plots
    .sort((a, b) => a.building?.__t < b.building?.__t ? -1 : 1)
    .reduce((acc, plot) => {
      const capableType = plot.building?.capableType;
      if (!acc[capableType]) acc[capableType] = [];
      acc[capableType].push(plot);
      return acc;
    }, {});
  }, [plots]);

  return (
    <Wrapper>
      <SectionWrapper>
        <HudMenuCollapsibleSection
          titleText="Buildings"
          titleLabel={`${buildingTally.toLocaleString()} Asset${buildingTally === 1 ? '' : 's'}`}>
          {asteroid && plots && !isLoading && (
            <>
              {buildingTally === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied on lots on this asteroid yet.</div>}
              {buildingTally > 0 && Object.keys(buildingsByType).map((capableType, i) => (
                <Fragment key={capableType}>
                  {i > 0 && <Rule />}
                  <PlotTable>
                    <tbody>
                      {buildingsByType[capableType].map((plot) => <BuildingRow key={plot.i} plot={plot} />)}
                    </tbody>
                  </PlotTable>
                </Fragment>
              ))}
            </>
          )}
        </HudMenuCollapsibleSection>
      </SectionWrapper>
      <SectionWrapper>
        <HudMenuCollapsibleSection
          titleText="Ships"
          titleLabel="0 Assets">
          <></>
        </HudMenuCollapsibleSection>
      </SectionWrapper>
      <SectionWrapper>
        <HudMenuCollapsibleSection
          titleText="Stationed Crewmates"
          titleLabel="0 Assets"
          borderless>
          <></>
        </HudMenuCollapsibleSection>
      </SectionWrapper>
    </Wrapper>
  );
};

export default AsteroidAssets;