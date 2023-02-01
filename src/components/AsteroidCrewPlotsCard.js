import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Capable, Construction } from '@influenceth/sdk';

import NumberInput from '~/components/NumberInput';
import { usePlotLink } from '~/components/PlotLink';
import useAsteroidCrewPlots from '~/hooks/useAsteroidCrewPlots';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';

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

  const status = useMemo(() => {
    if (plot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (plot.building?.capableType === 2 && plot.building?.extraction?.status > 0) {
        return 'Extracting';
      }
      return 'Ready';
    }
    if (plot.building?.construction?.status === Construction.STATUS_PLANNED && plot.gracePeriodEnd < chainTime) {
      return 'At Risk';
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
  const dispatchPlotSelected = useStore(s => s.dispatchPlotSelected);

  const handleLotJumper = useCallback((e) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      dispatchPlotSelected(asteroid?.i, parseInt(e.currentTarget.value));
    }
  }, [asteroid?.i]);

  const plotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);
  
  return (
    <div {...restProps} style={{ overflowY: 'auto' }}>
      {asteroid && plots && !isLoading && (
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
      <div style={{ alignItems: 'center', background: 'rgba(50, 50, 50, 0.5)', display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '4px 8px' }}>
        <label>Jump to Lot #</label>
        <NumberInput
          initialValue={null}
          max={plotTally}
          min={1}
          step={1}
          onBlur={(e) => e.currentTarget.value = undefined}
          onKeyDown={handleLotJumper} />
      </div>
    </div>
  );
};

export default AsteroidCrewPlotsCard;
