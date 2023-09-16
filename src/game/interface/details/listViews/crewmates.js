import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Crewmate } from '@influenceth/sdk';

import {
  CrewIcon,
  CrewmateIcon,
  MyAssetIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import formatters from '~/lib/formatters';

const useColumns = () => {
  const { account } = useAuth();
  const { crewmateMap } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => !!crewmateMap[row.id] ? <MyAssetIcon /> : null,
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        icon: <CrewmateIcon />,
        label: 'Name',
        sortField: 'Name.name', // TODO: figure out why elastic doesn't like this
        selector: row => formatters.crewmateName(row),
        unhideable: true
      },
      {
        key: 'crew',
        icon: <CrewIcon />,
        label: 'Crew',
        sortField: 'Control.controller.id',
        selector: row => row.Control?.controller?.id,
      },
      {
        key: 'class',
        label: 'Class',
        sortField: 'Crewmate.class',
        selector: row => row.Crewmate ? Crewmate.Entity.getClass(row)?.name : null,
      },
      {
        key: 'collection',
        label: 'Collection',
        sortField: 'Crewmate.coll',
        selector: row => row.Crewmate ? Crewmate.Entity.getCollection(row)?.name : null,
      },
      {
        key: 'traits',
        label: 'Traits',
        selector: row => {
          const traits = row.Crewmate ? Crewmate.Entity.getCombinedTraits(row) : [];

          return traits
            .map((t) => Crewmate.getTrait(t)?.name)
            .filter((t) => !!t)
            .join(', ');
        }
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crewmateMap]);
};

export default useColumns;