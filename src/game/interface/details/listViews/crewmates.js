import { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { toCrewClass, toCrewCollection, toCrewTrait } from '@influenceth/sdk';

import {
  CrewIcon,
  CrewmateIcon,
  MyAssetIcon,
} from '~/components/Icons';
import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';

const useColumns = () => {
  const { account } = useAuth();
  const { crewMemberMap } = useCrewContext();

  return useMemo(() => {
    const columns = [
      {
        key: 'my',
        align: 'center',
        icon: <MyAssetIcon />,
        selector: row => !!crewMemberMap[row.crew],
        bodyStyle: { fontSize: '24px' },
        requireLogin: true,
        unhideable: true
      },
      {
        key: 'name',
        icon: <CrewmateIcon />,
        label: 'Name',
        // sortField: 'name',
        selector: row => row.name,
        unhideable: true
      },
      {
        key: 'crew',
        icon: <CrewIcon />,
        label: 'Crew',
        sortField: 'crew.i',
        selector: row => row.crew?.i,
      },
      {
        key: 'class',
        label: 'Class',
        sortField: 'class',
        selector: row => row.class ? toCrewClass(row.class) : '',
      },
      {
        key: 'collection',
        label: 'Collection',
        sortField: 'collection',
        selector: row => row.collection ? toCrewCollection(row.collection) : '',
      },
      {
        key: 'traits',
        label: 'Traits',
        selector: row => Array.isArray(row.traits) ? row.traits.filter((t) => !!t).map((t) => toCrewTrait(t)?.name).join(', ') : '',
      },
    ];

    return columns.filter((c) => account || !c.requireLogin);
  }, [account, crewMemberMap]);
};

export default useColumns;