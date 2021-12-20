import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';

const LandingPage = (props) => {
  const { path, param1, param2, param3 } = useParams();
  const history = useHistory();

  useEffect(() => {
    if (path === 'crew-assignment' || path === 'crew-assignments') {
      window.location.href = 'https://discord.gg/nnVhHcdkmG';
    } else {
      history.push('/');
    }
  }, [history, path, param1, param2, param3]);

  return null;
};

export default LandingPage;
