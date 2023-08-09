import { useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import LoadingSpinner from 'react-spinners/PuffLoader';

import useAuth from '~/hooks/useAuth';
import useCrewContext from '~/hooks/useCrewContext';
import ButtonAlt from '~/components/ButtonAlt';
import ButtonPill from '~/components/ButtonPill';
import CrewCard from '~/components/CrewCard';
import InfluenceLogo from '~/components/InfluenceLogo';
import TriangleTip from '~/components/TriangleTip';
import { CaptainIcon, PlusIcon } from '~/components/Icons';
import useStore from '~/hooks/useStore';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import theme from '~/theme';

export const logoDisplacementHeight = 900;
const hoverBgColor = '#07171e';

const opacityKeyframes = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
`;
const opacityAnimation = css`
  animation: ${opacityKeyframes} 1200ms ease-in-out infinite;
  transition: opacity 250ms ease;
  &:hover {
    animation: none;
    opacity: 1;
  }
`;

const MainContent = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 640px;
  padding: ${p => p.loggedIn ? '40px 0' : '100px 0 60px'};
  justify-content: center;
  width: 700px;

  @media (max-height: 700px) {
    justify-content: flex-start;
    overflow: auto;
    margin: 20px 0;
    padding: 0;
  }
`;

const LogoContainer = styled.div`
  ${p => p.loggedIn ? 'padding: 0 0 40px;' : 'flex: 1;'}
  text-align: center;
  width: 100%;
  & > svg {
    max-width: 540px;
  }

  @media (max-height: ${logoDisplacementHeight - 1}px) {
    display: none;
  }
`;

const Loading = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: 20px;
  & > div {
    height: 60px;
    width: 60px;
  }
  & > h4 {
    margin: 0 0 0 8px;
  }
`;

const AccountCTA = styled.div`
  background-color: black;
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  display: flex;
  flex-direction: column;
  font-size: 15px;
  justify-content: center;
  width: 100%;
`;

const CrewCTA = styled(AccountCTA)`
  padding: 50px 50px 70px;
  position: relative;

  & h3 {
    font-size: 14px;
    margin: 0 0 25px;
    text-transform: uppercase;
  }
`;

const NotConnected = styled.div`
  & > button {
    ${opacityAnimation};
  }

  align-items: center;
  display: flex;
  justify-content: center;

  & span {
    padding: 35px 50px;
  }

  & span:before {
    background-color: ${p => p.theme.colors.red};
    border-radius: 50%;
    content: "";
    display: inline-block;
    height: 10px;
    margin-right: 7px;
    width: 10px;
  }
`;

const LogoutLink = styled.a`
  color: ${p => p.theme.colors.main};
  position: absolute;
  right: 15px;
  text-decoration: none;
  top: 10px;

  &:hover {
    text-decoration: underline;
  }
`;

const CaptainDetails = styled.div`
  left: 170px;
  position: absolute;
`;

const CaptainTitle = styled.span`
  color: ${p => p.theme.colors.secondaryText};
  font-size: 14px;
`;

const CaptainName = styled.h2`
  margin: 0;
  padding-top: 3px;
`;

const StyledCaptainIcon = styled(CaptainIcon)`
  bottom: -20px;
  height: 25px !important;
  left: 30px;
  position: absolute;
  width: auto !important;
`;

const StyledTriangleTip = styled(TriangleTip)`
  color: ${p => p.theme.colors.secondaryText};
  height: 30px;
  left: 0;
  position: absolute;
  top: 194px;
  width: 100%;
`;

const CaptainCardContainer = styled.div`
  border: 1px solid ${p => p.theme.colors.secondaryText};
  border-bottom: none;
  margin-right: 20px;
  padding: 10px;
  position: relative;
  width: 150px;
`;

const CrewCardContainer = styled.div`
  border: 1px solid #888;
  margin: 60px 10px 0 0;
  width: 96px;
`;

const CrewContainer = styled.div`
  align-items: flex-start;
  display: flex;
  position: relative;
  width: 100%;
  ${p => p.noCrew && css`
    ${CaptainCardContainer} {
      border-color: #555;
      cursor: ${p.theme.cursors.active};
      transition: background-color 250ms ease;

      ${StyledTriangleTip} path {
        stroke: #555;
      }
      &:not(:hover) {
        ${StyledCaptainIcon} {
          & * {
            fill: rgba(255, 255, 255, 0.25) !important;
          }
        }
      }
      &:hover {
        background-color: ${hoverBgColor};
        border-color: ${p => p.theme.colors.main};
        ${StyledTriangleTip} {
          polygon {
            fill: ${hoverBgColor};
          }
          path {
            stroke: ${p => p.theme.colors.main};
          }
        }
      }
    }
    ${CrewCardContainer} {
      border-color: #555;
      opacity: 0.5;
      padding: 3px;
    }
  `}
`;

const PlayCTA = styled.div`
  ${p => p.loggedIn && opacityAnimation};
  align-items: center;
  display: flex;
  justify-content: space-around;
  padding-top: 20px;
`;

const MainButton = styled(ButtonAlt)`
  color: black;
  &:hover {
    color: white;
  }
`;

const Account = () => {
  const history = useHistory();
  const { account, logout } = useAuth();
  const { captain, loading: crewLoading, crew, crewmateMap } = useCrewContext();

  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);
  const dispatchCutscene = useStore(s => s.dispatchCutscene);
  const dispatchLauncherPage = useStore(s => s.dispatchLauncherPage);
  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);

  const loggedIn = !!account;

  const onClickPlay = useCallback(() => {
    // if crew is done loading and there are no crewmates, send to owned-crew first
    if (loggedIn && !crewLoading && !(crew?.crewmates?.length > 0)) {
      history.push('/owned-crew');
    }
    dispatchLauncherPage();

    // if have not seen trailer, mark it as seen and play it now
    if (!hasSeenIntroVideo) {
      dispatchSeenIntroVideo(true);
      dispatchCutscene(
        `${process.env.REACT_APP_CLOUDFRONT_OTHER_URL}/influence/goerli/videos/intro.m3u8`,
        true
      );
    }
  }, [crewLoading, crew?.crewmates, dispatchLauncherPage, dispatchCutscene, dispatchSeenIntroVideo, hasSeenIntroVideo]);

  return (
    <MainContent loggedIn={loggedIn}>
      <LogoContainer loggedIn={loggedIn}>
        <InfluenceLogo />
      </LogoContainer>
      {!loggedIn &&
        <AccountCTA>
          <NotConnected>
            <span>Account Not Connected</span>
            <ButtonPill onClick={() => dispatchLauncherPage('wallets')}>Login</ButtonPill>
          </NotConnected>
        </AccountCTA>
      }
      {loggedIn &&
        <CrewCTA>
          <LogoutLink onClick={logout}>Log Out</LogoutLink>
          {crewLoading && (
            <Loading>
              <div><LoadingSpinner color={theme.colors.main} /></div>
              <h4>Loading Crew...</h4>
            </Loading>
          )}
          {!crewLoading && crew?.crewmates?.length > 0 && (
            <CrewContainer>
              {captain && <>
                <CaptainDetails>
                  <CaptainTitle>Captain</CaptainTitle>
                  <CaptainName>{captain.name}</CaptainName>
                </CaptainDetails>
                <CaptainCardContainer>
                  <CrewCard crewmate={captain} hideNameInHeader hideCollectionInHeader hideFooter hideMask />
                  <StyledTriangleTip extendStroke strokeColor="currentColor" strokeWidth="1.5" />
                  <StyledCaptainIcon />
                </CaptainCardContainer>
              </>}
              {crew.crewmates.slice(1).map((crewmateId) => {
                const crewmate = crewmateMap[crewmateId];
                if (crewmate) {
                  return (
                    <CrewCardContainer key={crewmate.i}>
                      <CrewCard crewmate={crewmate} hideNameInHeader hideCollectionInHeader hideFooter hideMask />
                    </CrewCardContainer>
                  );
                }
              })}
            </CrewContainer>
          )}
          {!crewLoading && !(crew?.crewmates?.length > 0) && (
            <CrewContainer noCrew>
              <>
                <CaptainDetails>
                  <CaptainTitle>Get Started</CaptainTitle>
                  <CaptainName>Crew is Waiting to be Assigned</CaptainName>
                </CaptainDetails>
                <CaptainCardContainer onClick={onClickPlay}>
                  <CrewSilhouetteCard overlay={{
                    alwaysOn: ['icon'],
                    disableHover: true,
                    icon: <PlusIcon />,
                    iconSize: 70,
                    rgb: theme.colors.mainRGB,
                  }} />
                  <StyledTriangleTip extendStroke strokeColor="currentColor" strokeWidth="1.5" />
                  <StyledCaptainIcon />
                </CaptainCardContainer>
              </>
              {[1,2,3,4].map((i) => (
                <CrewCardContainer key={i}>
                  <CrewSilhouetteCard />
                </CrewCardContainer>
              ))}
            </CrewContainer>
          )}
        </CrewCTA>
      }
      <PlayCTA loggedIn={loggedIn}>
        <MainButton
          background={theme.colors.main}
          color={theme.colors.main}
          size="huge"
          onClick={onClickPlay}>
          {loggedIn ? "Play" : "Explore"}
        </MainButton>
      </PlayCTA>
    </MainContent>
  );
};

export default Account;
