import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';

const LandingPage = (props) => {
  const { source } = useParams();
  const history = useHistory();

  useEffect(() => {
    if (source === 'assignments') {
      window.location.href = 'https://discord.gg/nnVhHcdkmG';
    } else {
      history.push('/');
    }
  }, []);

  return null;
};

export default LandingPage;
