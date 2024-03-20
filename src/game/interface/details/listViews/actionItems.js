import { useMemo } from 'react';
import styled from 'styled-components';
import { Lot } from '@influenceth/sdk';

import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import { itemColors, statuses } from '~/lib/actionItem';
import { LocationLink } from './components';
import { LinkIcon } from '~/components/Icons';
import LiveTimer from '~/components/LiveTimer';
import useChainTime from '~/hooks/useChainTime';

const AtRisk = styled.b`
  color: rgb(${itemColors.plans});
  text-transform: uppercase;
`;
const Highlight = styled.i`
  font-style: normal;
`;
const MainColor = styled.span`
  color: ${p => p.theme.colors.main};
`;
const ProgressBar = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  height: 6px;
  margin-right: 15px;
  position: relative;
  width: 150px;
  &:before {
    content: ' ';
    background: ${p => p.theme.colors.main};
    border-radius: 3px;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: ${p => p.progress}%;
  }
`;
const Status = styled(Highlight)`
  text-transform: uppercase;
  margin-right: 8px;
`;

const Progress = ({ start, finish }) => {
  const chainTime = useChainTime();
  const progress = useMemo(() => {
    return 100 * (chainTime - start) / (finish - start);
  }, [chainTime, start, finish])
  return <ProgressBar progress={progress} />;
}

// TODO: ecs refactor
const useColumns = () => {
  const { accountAddress } = useSession();
  const { crew } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'icon',
        align: 'center',
        bodyStyle: { fontSize: '24px' },
        selector: (row) => <Highlight>{row.icon}</Highlight>,
        unhideable: true,
      },
      {
        key: 'label',
        label: 'Action',
        sortField: 'label',
        selector: row => (
          <>
            {statuses[row.type] && <Status>{statuses[row.type]}</Status>}
            {row.label}
          </>
        ),
        unhideable: true,
      },
      {
        key: 'time',
        label: 'Time',
        sortField: 'time',
        bodyStyle: { width: '272px' },
        selector: row => (
          <>
            {row.type === 'unready' && row.finishTime && (
              <Progress start={row.startTime} finish={row.finishTime} />
            )}
            <Highlight style={{ display: 'inline-block' }}>
              {row.type === 'pending' && 'Just Now'}
              {(row.type === 'ready' || row.type === 'failed') && row.ago}
              {row.type === 'unready' && row.finishTime && <MainColor><LiveTimer target={row.finishTime} maxPrecision={2} /></MainColor>}
              {row.type === 'plans' && (
                row.finishTime
                  ? <LiveTimer target={row.finishTime} maxPrecision={2} prefix="remaining " />
                  : <AtRisk>at risk</AtRisk>
              )}
            </Highlight>
          </>
        ),
      },
      {
        key: 'asteroid',
        label: 'Asteroid',
        sortField: 'asteroidId',
        selector: row => row.asteroidId && (
          <>
            <LocationLink asteroidId={row.asteroidId} resourceId={row.resourceId} />
            <span>{row.asteroidId.toLocaleString()}</span>
          </>
        ),
      },
      {
        key: 'lot',
        label: 'Lot',
        sortField: 'lotId',
        selector: row => row.lotId && (
          <>
            <LocationLink lotId={row.lotId} resourceId={row.resourceId} />
            <span>{Lot.toIndex(row.lotId).toLocaleString()}</span>
          </>
        ),
      },
      {
        key: 'txHash',
        align: 'center',
        bodyStyle: { fontSize: '24px' },
        selector: row => {
          if (row.type === 'failed' && row.txHash && process.env.REACT_APP_STARKNET_EXPLORER_URL) {
            return (
              <a href={`${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${row.txHash}`}
                target="_blank"
                rel="noopener noreferrer">
                <LinkIcon />
              </a>
            );
          }
          return null;
        },
        unhideable: true,
      },
    ];

    return columns.filter((c) => accountAddress || !c.requireLogin);
  }, [accountAddress, crew?.id]);
};

export default useColumns;