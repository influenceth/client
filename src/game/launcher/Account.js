import { useEffect } from 'react';

import useAuth from '~/hooks/useAuth'
import { useControlledAlert } from '~/game/interface/Alerts';
import { InfluenceIcon } from '~/components/Icons';
import styled from 'styled-components';

const Content = styled.div`
  color: ${p => p.theme.colors.main};
  a {
    text-decoration: none;
    white-space: nowrap;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Account = () => {
  const { token } = useAuth();
  const { create, destroy } = useControlledAlert();

  useEffect(() => {
    if (!token) {
      const alertId = create({
        icon: <InfluenceIcon />,
        content: (
          <Content>
            Welcome to the star system <b>Adalia</b>.
            {' '}Explore the live world as a guest without logging in.
            {' '}<a href="https://wiki.influenceth.io/en/docs/user-guides" target="_blank" rel="noopener noreferrer">See Here</a>
            {' '}for help getting started.
          </Content>
        )
      });
      return () => {
        destroy(alertId);
      }
    }
  }, [token]);

  return null;
}

export default Account;