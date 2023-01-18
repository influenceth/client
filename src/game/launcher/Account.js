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
  filter: drop-shadow(2px 2px 2px #222);
  width: 500px;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
`;

const AccountCTA = styled.div`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  flex-direction: column;
  font-size: 15px;
  height: 300px;
  justify-content: center;
  margin-top: 50px;
  width: 100%;

  & h3 {
    font-size: 14px;
    margin: 25px 50px;
    text-transform: uppercase;
  }
`;

const NotConnected = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;

  & span {
    padding: 35px 50px;
  }
`;

const CrewContainer = styled.div`
  align-items: flex-start;
  display: flex;
  padding: 0 50px 35px 50px;
  position: relative;
  width: 100%;
`;

const CaptainTitle = styled.span`
  color: ${p => p.theme.colors.secondaryText};
  font-size: 14px;
  left: 220px;
  position: absolute;
`;

const CaptainName = styled.h2`
  left: 220px;
  padding-top: 3px;
  position: absolute;
`;

const CaptainContain = styled.div`
  border: 1px solid #888;
  margin-right: 20px;
  padding: 10px;
  width: 150px;
`;

const CrewContain = styled.div`
  border: 1px solid #888;
  margin: 60px 10px 0 0;
  width: 90px;
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
  const { captain, loading: crewLoading, crew, crewMemberMap } = useCrew();

  return (
    <StyledAccount>
      <StyledLogo />
      <MainContent>
        {!loggedIn &&
          <AccountCTA>
            <NotConnected>
              <span>Account Not Connected</span>
              <ButtonPill onClick={() => history.push('/launcher/wallets')}>Login</ButtonPill>
            </NotConnected>
          </AccountCTA>
        }
        {loggedIn &&
          <AccountCTA>
            <h3>Active Crew</h3>
            {!crewLoading && crew?.crewMembers && crew?.crewMembers.length > 0 &&
              <CrewContainer>
                <CaptainTitle>Captain</CaptainTitle>
                <CaptainName>{captain.name}</CaptainName>
                <CaptainContain>
                  <CrewCard crew={captain} hideNameInHeader hideCollectionInHeader hideFooter hideMask />
                </CaptainContain>
                {crew.crewMembers.slice(1).map(function(crewmateId) {
                  const crewmate = crewMemberMap[crewmateId];
                  return (
                    <CrewContain key={crewmate.i}>
                      <CrewCard crew={crewmate} hideNameInHeader hideCollectionInHeader hideFooter hideMask />
                    </CrewContain>
                  );
                })}
              </CrewContainer>
            }
          </AccountCTA>
        }
        <PlayCTA>
          <MainButton color={theme.colors.main} size='large' onClick={() => history.push('/game')}>
            {loggedIn ? "Play" : "Explore"}
          </MainButton>
        </PlayCTA>
      </MainContent>
    </StyledAccount>
  );
};

export default Account;
