import { useMemo } from '~/lib/react-debug';
import styled from 'styled-components';
import moment from 'moment';

import { LinkIcon, } from '~/components/Icons';
import useSession from '~/hooks/useSession';
import useCrewContext from '~/hooks/useCrewContext';
import { LocationLink } from './components';
import OnClickLink from '~/components/OnClickLink';
import theme from '~/theme';
import formatters from '~/lib/formatters';

const Content = styled.div`
  & a,
  ${OnClickLink} {
    color: inherit;
    display: inline-block;
    pointer-events: none;
    text-decoration: none;
  }
`;
// TODO: pointer-events is a bit hacky to reuse getLogContent,
//  so if we come back and address that, we'll probably want to
//  remove this hack

const LocationLabel = styled.span`
  margin-right: 8px;
`;
const BuildingLabel = styled.span`
  color: white;
`;

// TODO: ecs refactor

const useColumns = () => {
  const { accountAddress } = useSession();
  const { crew } = useCrewContext();

  return useMemo(import.meta.url, () => {
    const columns = [
      {
        key: 'icon',
        align: 'center',
        bodyStyle: { color: 'white', fontSize: '24px' },
        selector: (row) => row.icon,
        unhideable: true,
      },
      {
        key: 'content',
        label: 'Event',
        selector: row => <Content>{row.content}</Content>,
        unhideable: true,
      },
      {
        key: 'time',
        align: 'center',
        label: 'Time',
        selector: row => (new moment(new Date(1000 * (row.activity.event.timestamp || 0)))).fromNow(),
      },
      {
        key: 'location',
        label: ' ',
        align: 'right',
        selector: row => {
          return null;
          if (!row.e.linked) return null;

          // TODO: ecs refactor
          const asteroid = row.e.linked.find((l) => l.type === 'Asteroid')?.asset;
          const lot = row.e.linked.find((l) => l.type === 'Lot')?.asset;
          const building = (lot && lot.building?.type) || 'Empty Lot';

          if (!asteroid) return null;
          return (
            <>
              <LocationLabel>
                <BuildingLabel>{lot ? `${building} > ` : ``}</BuildingLabel>
                {formatters.asteroidName(asteroid)}
              </LocationLabel>
              <LocationLink lotId={lot?.id} />
            </>
          );
        },
        unhideable: true,
      },
      {
        key: 'txLink',
        align: 'center',
        bodyStyle: { fontSize: '20px' },
        selector: row => row.txLink && (
          <a style={{ color: theme.colors.main }} href={row.txLink} target="_blank" rel="noopener noreferrer">
            <LinkIcon />
          </a>
        ),
        unhideable: true,
      },
    ];

    return columns.filter((c) => accountAddress || !c.requireLogin);
  }, [accountAddress, crew?.id]);
};

export default useColumns;