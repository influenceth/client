import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';

const Redirector = () => {
  const history = useHistory();
  const { token } = useAuth();
  const { crew, loading } = useCrew();

  const [loggedOut, setLoggedOut] = useState(!token);

  useEffect(() => {
    // if just logged in, send to /owned-crew if no crew yet OR selected crew has no members
    if (loggedOut && token && !loading) {
      setLoggedOut(false);
      if (!(crew?.crewMembers?.length > 0)) {
        history.push('/owned-crew');
      }
    }
  }, [ loggedOut, token, crew, loading ]);  // eslint-disable-line react-hooks/exhaustive-deps

  // logout if have logged out
  useEffect(() => {
    if (!token) {
      setLoggedOut(true);
    }
  }, [!token]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default Redirector;
