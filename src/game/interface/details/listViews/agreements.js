import { useMemo } from 'react';
import styled from 'styled-components';
import { Building, Entity, Permission } from '@influenceth/sdk';

import { MyAssetIcon, SwayIcon } from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import { LocationLink } from './components';
import formatters from '~/lib/formatters';
import EntityName from '~/components/EntityName';

import { formatFixed, formatTimer, monthsToSeconds, secondsToMonths } from '~/lib/utils';
import useBlockTime from '~/hooks/useBlockTime';
import actionButtons from '../../hud/actionButtons';
import useActionButtons from '~/hooks/useActionButtons';
import { getAgreementPath } from '~/hooks/actionManagers/useAgreementManager';

const Highlight = styled.span`
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

const Remaining = styled.span`
  display: inline-block;
  text-align: right;
  padding-right: 8px;
  width: 40px;
`;

const Progress = ({ start, finish }) => {
  const blockTime = useBlockTime();

  const [progress, timeRemaining] = useMemo(() => ([
    100 * (Date.now() / 1000 - start) / (finish - start),
    formatTimer(finish - (Date.now() / 1000), 1)
  ]), [blockTime, start, finish])

  return (
    <>
      <Remaining>{timeRemaining}</Remaining>
      <ProgressBar progress={progress} />
    </>
  );
}

const useColumns = () => {
  const { account } = useAuth();
  const { crew } = useCrewContext();
  const { props: actionProps } = useActionButtons();

  return useMemo(() => {
    const columns = [
      /* TODO: "mine" if controller or permitted
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => true? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      */
      {
        key: 'type',
        label: 'Agreement Type',
        sortField: 'address',
        selector: row => (
          <Highlight>
           {Permission.POLICY_TYPES[Permission.POLICY_IDS[row.address ? 'CONTRACT' : 'PREPAID']].name}
          </Highlight>
        )
      },
      {
        key: 'permitted',
        label: 'Permitted Crew',
        sortField: 'permitted.id',
        selector: row => <EntityName {...row.permitted} />,
        unhideable: true
      },
      {
        key: 'permission',
        label: 'Permission',
        sortField: 'permission',
        selector: row => Permission.TYPES[row.permission].name
      },
      {
        key: 'time',
        label: 'Time Remaining',
        sortField: 'endTime',
        selector: row => row.address
          ? <>until canceled</>
          : <Progress start={row.startTime} finish={row.endTime} /> // TODO: factor in noticeTime?
      },
      {
        key: 'rate',
        label: 'Rate',
        sortField: 'rate',
        selector: row => row.address ? `n/a` : (
          <>
            <SwayIcon />
            {formatFixed((monthsToSeconds(1) * row.rate / 3600) / 1e6, 2)}
            {' '}/ mo
          </>
        )
      },
      {
        key: 'min',
        label: 'Minimum',
        sortField: 'initialTerm',
        selector: row => row.address ? `n/a` : `${formatFixed(secondsToMonths(row.initialTerm), 2)} mo`
      },
      {
        key: 'notice',
        label: 'Notice',
        sortField: 'noticePeriod',
        selector: row => row.address ? `n/a` : `${formatFixed(secondsToMonths(row.noticePeriod), 2)} mo`
      },
      {
        key: '_expandable',
        skip: true,
        selector: row => {
          if (row.entity.Control?.controller?.id === crew?.id) {
            return (
              <div style={{ padding: '10px 15px' }}>
                <actionButtons.EndAgreement.Component
                  {...actionProps}
                  entity={row.entity}
                  permission={row.permission}
                  agreementPath={getAgreementPath(row.entity, row.permission, row.permitted)} />
              </div>
            )
          } else if (row.permitted?.id === crew?.id) {
            return (
              <div style={{ padding: '10px 15px' }}>
                <actionButtons.ExtendAgreement.Component
                  {...actionProps}
                  entity={row.entity}
                  permission={row.permission} />
              </div>
            )
          }
          return null;
        }
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crew?.id]);
};

export default useColumns;