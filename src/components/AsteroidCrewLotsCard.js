import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Capable, Construction } from '@influenceth/sdk';

import NumberInput from '~/components/NumberInput';
import { useLotLink } from '~/components/LotLink';
import useAsteroidCrewLots from '~/hooks/useAsteroidCrewLots';
import useChainTime from '~/hooks/useChainTime';
import useStore from '~/hooks/useStore';

const LotTable = styled.table`
  border-collapse: collapse;
`;
const LotRow = styled.tr`
  cursor: ${p => p.theme.cursors.active};
  & > * {
    padding: 4px 4px;
  }
  &:hover > td {
    background: rgba(255, 255, 255, 0.05);
  }
`;
const LotId = styled.td`
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

const BuildingRow = ({ lot }) => {
  const chainTime = useChainTime();
  const onClick = useLotLink({
    asteroidId: lot.asteroid,
    lotId: lot.i,
  });

  const status = useMemo(() => {
    if (lot.building?.construction?.status === Construction.STATUS_OPERATIONAL) {
      if (lot.building?.capableType === 2 && lot.building?.extraction?.status > 0) {
        return 'Extracting';
      }
      return 'Ready';
    }
    if (lot.building?.construction?.status === Construction.STATUS_PLANNED && lot.gracePeriodEnd < chainTime) {
      return 'At Risk';
    }
    return Construction.STATUSES[lot.building?.construction?.status || 0];
  }, [lot.building]);

  return (
    <LotRow onClick={onClick}>
      <LotId>{(lot.i || '').toLocaleString()}</LotId>
      <Building>{Capable.TYPES[lot.building?.capableType || 0].name}</Building>
      <Status status={status}>{status}</Status>
    </LotRow>
  );
};

const AsteroidCrewLotsCard = (props) => {
  const { asteroid, ...restProps } = props;
  const { data: lots, isLoading } = useAsteroidCrewLots(asteroid?.i);
  const dispatchLotSelected = useStore(s => s.dispatchLotSelected);

  const handleLotJumper = useCallback((e) => {
    if (e.key === 'Enter' && e.currentTarget.value) {
      dispatchLotSelected(asteroid?.i, parseInt(e.currentTarget.value));
    }
  }, [asteroid?.i]);

  const lotTally = useMemo(() => Math.floor(4 * Math.PI * Math.pow(asteroid?.radius / 1000, 2)), [asteroid?.radius]);
  
  return (
    <div {...restProps} style={{ overflowY: 'auto' }}>
      {asteroid && lots && !isLoading && (
        <>
          {lots.length === 0 && <div style={{ padding: '15px 10px', textAlign: 'center' }}>Your crew has not occupied any lots on this asteroid yet.</div>}
          {lots.length > 0 && (
            <LotTable>
              <tbody>
                {lots.map((lot) => <BuildingRow key={lot.i} lot={lot} />)}
              </tbody>
            </LotTable>
          )}
        </>
      )}
      <div style={{ alignItems: 'center', background: 'rgba(50, 50, 50, 0.5)', display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '4px 8px' }}>
        <label>Jump to Lot #</label>
        <NumberInput
          initialValue={null}
          max={lotTally}
          min={1}
          step={1}
          onBlur={(e) => e.currentTarget.value = undefined}
          onKeyDown={handleLotJumper} />
      </div>
    </div>
  );
};

export default AsteroidCrewLotsCard;
