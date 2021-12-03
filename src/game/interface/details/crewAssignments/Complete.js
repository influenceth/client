import React, { useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import {
  BiWrench as WrenchIcon,
  BiMoney as SwayIcon,
} from 'react-icons/bi';

import TwitterLogo from '~/assets/images/twitter-icon.svg';
import Button from '~/components/Button';
import CopyReferralLink from '~/components/CopyReferralLink';
import Details from '~/components/Details';
import {
  LinkIcon,
  TrophyIcon
} from '~/components/Icons';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStorySession from '~/hooks/useStorySession';
import CrewCard from './CrewCard';

const TitleBox = styled.div`
  border-bottom: 1px solid #444;
  border-top: 1px solid #444;
  color: white;
  display: flex;
  font-size: 40px;
  line-height: 40px;
  justify-content: center;
  margin: 0 auto;
  overflow: visible;
  padding: 10px 0 14px;
  text-transform: uppercase;
  white-space: nowrap;
  width: 250px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-top: 8px;
    white-space: normal;
  }
`;
const Content = styled.div`
  margin: 24px 12px;
  & > b {
    color: white;
    white-space: nowrap;
  }
`;
const CardContainer = styled.div`
  background: black;
  border: 1px solid #444;
  max-width: 100%;
  padding: 10px;
  width: 200px;
`;
const ImageryContainer = styled.div`
  position: relative;

  & > div:first-child {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    position: absolute;
    top: 20px;
    bottom: 20px;
    left: 0;
    right: 0;
    z-index: 1;
  }
  & > div:last-child {
    position: relative;
    z-index: 2;

    align-items: center;  
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
  }
`;

const rewardContainerTransition = keyframes`
  0% {
    height: 140px;
    width: 0;
    overflow: hidden;
  }
  50% {
    height: 140px;
    width: 400px;
    overflow: hidden;
  }
  100% {
    overflow: auto;
    width: 400px;
  }
`;
const RewardContainer = styled.div`
  animation: ${rewardContainerTransition} 500ms normal forwards ease-out 500ms;
  background: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 140px;
  max-width: 400px;
  width: 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const mobileRewardContainerTransition = keyframes`
  0% {
    max-height: 0;
  }
  50% {
    max-height: 35vh;
  }
  100% {
    max-height: 35vh;
  }
`;
const MobileRewardContainer = styled.div`
  display: none;
  width: 100%;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    animation: ${mobileRewardContainerTransition} 500ms normal forwards ease-out 500ms;
    display: initial;
    max-height: 0;
    & > div {
      max-height: 100%;
      overflow: auto;
    }
  }
`;

const rewardTransition = keyframes`
  0% { opacity: 0; }
  75% { opacity: 0; }
  100% { opacity: 1; }
`;
const Reward = styled.div`
  animation: ${rewardTransition} 500ms normal forwards ease-out 500ms;
  color: white;
  opacity: 0;
  padding: 8px 40px;
  text-align: left;
  & > h4 {
    font-size: 18px;
    font-weight: normal;
    margin: 0 0 12px;
  }
  & > div {
    align-items: flex-start;
    display: flex;
    margin-bottom: 8px;
    & > *:first-child {
      border: 1px solid #555;
      border-radius: 50%;
      font-size: 150%;
      margin-right: 0.5em;
      padding: 0.2em;
    }
    & > *:last-child {
      font-size: 13px;
      margin-bottom: 0;
      & > b {
        display: block;
        margin-bottom: 4px;
      }
      & > span {
        opacity: 0.7;
      }
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 8px 25px 0;
    & > h4 {
      color: #656565;
      font-size: 15px;
      font-weight: bold;
    }
  }
`;

const MobileFlourish = styled.div`
  border-bottom: 4px solid rgb(226, 84, 32);
  border-top: 4px solid transparent;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  height: 0;
  margin: 15px auto -10px;
  width: 50%;
  display: none;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: block;
  }
`;

const SharingPrompt = styled(Content)`
  display: inline-block;
  font-size: 90%;
  max-width: 600px;
  width: 90%;
`;
const SharingSection = styled.div`
  display: flex;
  margin-bottom: 24px;
  & > div {
    flex: 1;
  }
  & h5 {
    margin: 0;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex-direction: column;
  }
`;
const SwaySection = styled.div`
  border-right: 1px solid #444;
  color: rgb(226, 84, 32);
  
  & > div {
    align-items: center;
    background: rgb(226, 84, 32, 0.1);
    display: flex;
    font-size: 40px;
    font-weight: bold;
    justify-content: center;
    margin: 5px auto 10px;
    padding: 10px;
    width: 300px;
  }
`;
const TwitterSection = styled.div`
  & button {
    display: flex;
    height: 66px;
    justify-content: space-between;
    margin: 20px auto 10px;
    text-transform: uppercase;
    width: 300px;
  }
`;
const LinkWithIcon = styled.a`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 90%;
  justify-content: center;
  text-transform: uppercase;
  & > * {
    color: #656565;
    transition: color 100ms ease;
  }
  & > span {
    margin-left: 4px; 
  }
  &:hover > * {
    color: #999;
  }
`;

const FinishContainer = styled.div`
  padding-right: 12px;
  text-align: right;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-bottom: 12px;
  }
`;

// TODO: these should be loaded from session vvv
const rewards = [{
  Icon: WrenchIcon,
  title: 'Talented Mechanic',
  description: 'The limited scraps aboard the Arvad have made you extra resoureful with repurposing existing technologies to new needs.'
}];
// ^^^

const CrewAssignmentComplete = (props) => {
  const { account } = useWeb3React();
  const { id: sessionId } = useParams();
  const { data: allCrew } = useOwnedCrew();
  const { storyState } = useStorySession(sessionId);

  const crew = useMemo(() => {
    return allCrew && storyState && allCrew.find(({ i }) => i === storyState.owner);
  }, [storyState, allCrew]);

  const rewardNode = useMemo(() => {
    if (rewards.length > 0) {
      return (
        <Reward>
          <h4>This crew member has gained traits:</h4>
          {rewards.map(({ Icon, title, description }) => (
            <div key={title}>
              <Icon />
              <div style={{ flex: 1 }}>
                <b>{title}</b>
                <span>{description}</span>
              </div>
            </div>
          ))}
        </Reward>
      );
    }
    return null;
  }, []);

  const shareOnTwitter = useCallback(() => {
    const params = new URLSearchParams({
      text: [
        `I just completed @influenceth's "${storyState.title}"`,
        // (alternative to above): `Assignment completed: "${storyState.title}"\nTrait unlocked: “TODO”`
        `Come join the belt and become one of the first Adalians. Earn rewards by completing Crew Assignments TODAY.`,
        `Join Now:`,
      ].join('\n\n'),
      hashtags: 'PlayToEarn,PlayAndEarn,NFTGaming',
      url: `${process.env.REACT_APP_API_URL}/og/crew-assignment/${sessionId}/${account}`,
      //via: 'influenceth'
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`);
  }, [account, sessionId, storyState]);

  if (!storyState || !crew) return null;
  const onCloseDestination = `/crew-assignments/${storyState.book}`;
  return (
    <Details
      onCloseDestination={onCloseDestination}
      contentProps={{ style: { display: 'flex', flexDirection: 'column', } }}
      style={{ color: '#999', textAlign: 'center' }}>
      <TitleBox>Assignment Complete</TitleBox>
      <Content>Congratulations! You have completed <b>{storyState.title}</b> for your crew member.</Content>
      <ImageryContainer src={storyState.image}>
        <div />
        <div>
          <CardContainer>
            <CrewCard crew={crew} />
          </CardContainer>
          {rewardNode && (
            <RewardContainer>
              {rewardNode}
            </RewardContainer>
          )}
        </div>
      </ImageryContainer>
      {rewardNode && (
        <MobileRewardContainer>
          <div>
            {rewardNode}
          </div>
        </MobileRewardContainer>
      )}

      <MobileFlourish />

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center' }}>
        <div>
          {/* 
          <SharingPrompt>
            Earn <b>Sway</b> for each friend who signs up using your unique recruitment link.
            Recruitment Points can be later spent to unlock exclusive in-game items, rewards, and cosmetics!
          </SharingPrompt>
          */}
          <SharingSection>
            {/* TODO: sway-per-referral should probably be in influence-utils */}
            {/* 
            <SwaySection>
              <h5>Earned Per Recruitment</h5>
              <div>15 <SwayIcon /></div>
              <LinkWithIcon>
                <TrophyIcon />
                <span>Visit Recruitment Leaderboard</span>
              </LinkWithIcon>
            </SwaySection>
            */}
            <TwitterSection>
              <Button onClick={shareOnTwitter}>
                <span>Share on Twitter</span>
                <TwitterLogo />
              </Button>
              <CopyReferralLink>
                <LinkWithIcon>
                  <LinkIcon />
                  <span>Copy Recruitment Link</span>
                </LinkWithIcon>
              </CopyReferralLink>
            </TwitterSection>
          </SharingSection>
        </div>
      </div>
      <FinishContainer>
        <Link to={onCloseDestination}>FINISH</Link>
      </FinishContainer>
    </Details>
  );
};

export default CrewAssignmentComplete;
