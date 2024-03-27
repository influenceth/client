import { useContext } from 'react';

import SessionContext from '~/contexts/SessionContext';

const useSession = () => {
  return useContext(SessionContext);
};

export default useSession;
