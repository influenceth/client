import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';

const Redirector = () => {
  const history = useHistory();
  const { data: crew, isLoading: crewIsLoading } = useOwnedCrew();

  const token = useStore(s => s.auth.token);

  const [loggedOut, setLoggedOut] = useState(!token);

  useEffect(() => {
    // if just logged in and crew is ready, send to owned-crew if no crew yet
    if (loggedOut && !!token && !crewIsLoading && !!crew) {
      setLoggedOut(false);
      if (!crew.find((c) => parseInt(c.activeSlot) > -1)) {
        history.push('/owned-crew');
      }
    }
  }, [ loggedOut, !!token, crewIsLoading, !!crew ]);  // eslint-disable-line react-hooks/exhaustive-deps

  // logout if have logged out
  useEffect(() => {
    if (!token) {
      setLoggedOut(true);
    }
  }, [!token]);

  return null;
};

export default Redirector;
