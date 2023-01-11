import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';
import ButtonAlt from '~/components/ButtonAlt';
import ButtonPill from '~/components/ButtonPill';
import CrewCard from '~/components/CrewCard';
import InfluenceLogo from '~/assets/images/logo.svg';
import { useHistory } from 'react-router-dom';

const StyledLanding = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 20px;
  width: 700px;
`;

const StyledLogo = styled(InfluenceLogo)`
  width: 500px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
`;

const AccountCTA = styled.div`
  align-items: center;
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  font-size: 15px;
  justify-content: space-around;
  margin-top: ${p => p.margin || 0}px;
  padding: 25px 150px;
`;

const PlayCTA = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-around;
  padding-top: 25px;
`;

const Landing = (props) => {
  const history = useHistory();
  const { token, wallet } = useAuth();
  const { account } = wallet;
  const loggedIn = account && token;
  const crew = useCrew();

  return (
    <StyledLanding>
      <StyledLogo />
      <MainContent>
        {!loggedIn &&
          <AccountCTA margin={250}>
            <span>Account Not Connected</span>
            <ButtonPill onClick={() => history.push('/launcher/account')}>Login</ButtonPill>
          </AccountCTA>
        }
        {loggedIn &&
          <AccountCTA>
            {!crew.loading && crew.captain && <CrewCard crew={crew.captain} overlay={false} />}
          </AccountCTA>
        }
        <PlayCTA>
          <ButtonAlt onClick={() => history.push('/game')}>{loggedIn ? "Play" : "Explore"}</ButtonAlt>
        </PlayCTA>
      </MainContent>
    </StyledLanding>
  );
};

export default Landing;
