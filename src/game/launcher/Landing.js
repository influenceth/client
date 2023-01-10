import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import ButtonAlt from '~/components/ButtonAlt';
import ButtonPill from '~/components/ButtonPill';
import InfluenceLogo from '~/assets/images/logo.svg';
import { useHistory } from 'react-router-dom';

const StyledLanding = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 40px 20px;
  width: 700px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: 250px;
`;

const LoginCTA = styled.div`
  align-items: center;
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  font-size: 14px;
  justify-content: space-around;
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
  const { token, login, wallet } = useAuth();
  const { account, connectionOptions, disconnect, error, walletIcon, walletName } = wallet;
  const loggedIn = account && token;

  return (
    <StyledLanding>
      <InfluenceLogo />
      <MainContent>
        {!loggedIn &&
          <>
            <LoginCTA>
              <span>Account Not Connected</span>
              <ButtonPill onClick={() => history.push('/launcher/account')}>Login</ButtonPill>
            </LoginCTA>
          </>
        }
        <PlayCTA>
          <ButtonAlt onClick={() => history.push('/game')}>{loggedIn ? "Play" : "Explore"}</ButtonAlt>
        </PlayCTA>
      </MainContent>
    </StyledLanding>
  );
};

export default Landing;
