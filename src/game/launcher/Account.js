import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import useAuth from '~/hooks/useAuth';
import useCrew from '~/hooks/useCrew';
import ButtonAlt from '~/components/ButtonAlt';
import ButtonPill from '~/components/ButtonPill';
import CrewCard from '~/components/CrewCard';
import InfluenceLogo from '~/assets/images/logo.svg';
import theme from '~/theme';

const StyledAccount = styled.div`
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
  height: ${p => p.height || 0}px;
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

const MainButton = styled(ButtonAlt)`
  color: black;

  &:hover {
    color: white;
  }
`;

const Account = (props) => {
  const history = useHistory();
  const { token, wallet } = useAuth();
  const { account } = wallet;
  const loggedIn = account && token;
  const crew = useCrew();

  return (
    <StyledAccount>
      <StyledLogo />
      <MainContent>
        {!loggedIn &&
          <AccountCTA margin={250}>
            <span>Account Not Connected</span>
            <ButtonPill onClick={() => history.push('/launcher/wallets')}>Login</ButtonPill>
          </AccountCTA>
        }
        {loggedIn &&
          <AccountCTA margin={50} height={250}>
            {/* {!crew.loading && crew.captain && <CrewCard crew={crew.captain} overlay={false} />} */}
          </AccountCTA>
        }
        <PlayCTA>
          <MainButton color={theme.colors.main} onClick={() => history.push('/game')}>{loggedIn ? "Play" : "Explore"}</MainButton>
        </PlayCTA>
      </MainContent>
    </StyledAccount>
  );
};

export default Account;
