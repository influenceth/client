import { useQuery } from 'react-query';

import api from '~/lib/api';
import useAuth from '~/hooks/useAuth';
import useCrewContext from './useCrewContext';
import fakeShips from './_ships.json'

const useOwnedShips = () => {
  const { crew } = useCrewContext();

  return useQuery(
    [ 'ships', 'owner', crew?.i ],
    () => fakeShips.map((s) => ({ ...s, owner: crew?.i })),
    { enabled: !!crew?.i }
  );
};

export default useOwnedShips;
