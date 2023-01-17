import { useMemo } from 'react';
import styled from 'styled-components';
import { Capable, Construction } from '@influenceth/sdk';

import { usePlotLink } from '~/components/PlotLink';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';


const PlotTable = styled.table`
  border-collapse: collapse;
`;
const PlotRow = styled.tr`
  cursor: ${p => p.theme.cursors.active};
  & > * {
    padding: 4px 4px;
  }
  &:hover > td {
    background: rgba(255, 255, 255, 0.05);
  }
`;
const PlotId = styled.td`
  color: #777;
  text-align: center;
`;
const Building = styled.td`
  width: 100%;
`;
const Status = styled.td`
  color: ${p => {
    if (p.status === 'Extracting') return p.theme.colors.success;
    else if (p.status === 'Ready') return p.theme.colors.main;
    return '#777';
  }};
  text-align: right;
  text-transform: uppercase;
`;

const BuildingRow = ({ plot }) => {
  const onClick = usePlotLink({
    asteroidId: plot.asteroid,
    plotId: plot.i,
  });

  const status = useMemo(() => {
    if (plot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (plot.building?.capableType === 2 && plot.building?.extraction?.status > 0) {
        return 'Extracting';
      }
      return 'Ready';
    }
    return Construction.STATUSES[plot.building?.construction?.status || 0];
  }, [plot.building]);

  return (
    <PlotRow onClick={onClick}>
      <PlotId>{(plot.i || '').toLocaleString()}</PlotId>
      <Building>{Capable.TYPES[plot.building?.capableType || 0].name}</Building>
      <Status status={status}>{status}</Status>
    </PlotRow>
  );
};

const AsteroidCrewPlotsCard = (props) => {
  const { asteroid, ...restProps } = props;
  const { data: plots, isLoading } = useAsteroidCrewPlots(asteroid?.i);
  return (
    <div {...restProps}>
      {asteroid && !isLoading && (
        <>
          {plots.length === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied on lots on this asteroid yet.</div>}
          {plots.length > 0 && (
            <PlotTable>
              <tbody>
                {plots.map((plot) => <BuildingRow key={plot.i} plot={plot} />)}
              </tbody>
            </PlotTable>
          )}
        </>
      )}
    </div>
  );
};

export default AsteroidCrewPlotsCard;
