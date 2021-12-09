import React, { useCallback, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import { FaPortrait as RewardIcon } from 'react-icons/fa';
import { toCrewTrait } from 'influence-utils';

import Button from '~/components/Button';
import CopyReferralLink from '~/components/CopyReferralLink';
import Details from '~/components/Details';
import { LinkIcon, TwitterIcon } from '~/components/Icons';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStorySession from '~/hooks/useStorySession';
import CrewCard from './CrewCard';

const slideOutTransition = keyframes`
  0% {
    height: 296px;
    width: 0;
    overflow: hidden;
  }
  50% {
    height: 296px;
    width: 400px;
    overflow: hidden;
  }
  100% {
    overflow: auto;
    width: 400px;
  }
`;

const mobileSlideOutTransition = keyframes`
  0% {
    transform: scaleX(0);
  }
  50% {
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(1);
  }
`;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  75% { opacity: 0; }
  100% { opacity: 1; }
`;

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
  border: 1px solid rgba(255, 255, 255, 0.35);
  padding: 4px;
  position: relative;
  z-index: 3;
  & > div {
    background: black;
    max-width: 100%;
    padding: 8px;
    width: 220px;
  }
`;
const ImageryContainer = styled.div`
  display: flex;
  flex: 1;
  position: relative;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 15px 0;
  }

  & > div:first-child {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1;
    mask-image: linear-gradient(to bottom, black 0%, rgba(0, 0, 0, 0.7) 50%, transparent 100%);
    transition: opacity 750ms ease-out, background-image 750ms ease-out;
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

const SlideOut = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    animation: ${slideOutTransition} 500ms normal forwards ease-out 500ms;
    height: 296px;
    margin-left: -6px;
    overflow: hidden;
    width: 0;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    animation: ${mobileSlideOutTransition} 500ms normal forwards ease-out 500ms;
    transform: scaleX(0);
  }
`;

const RewardSection = styled.div`
  background: black;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 140px;

  & > div {
    animation: ${opacityTransition} 500ms normal forwards ease-out 500ms;
    color: white;
    opacity: 0;
    padding: 8px 40px;
    text-align: left;
    width: 400px;

    & > h4 {
      font-size: 18px;
      font-weight: normal;
      margin: 0 0 12px;
      @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
        color: #656565;
        font-size: 15px;
        font-weight: bold;
      }
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
      width: 100%;
    }
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background: rgba(0, 0, 0, 0.8);
    height: auto;
    margin: -20px 8px 0;
    max-width: 400px;
    padding: 20px 0 10px;
  }
`;

const TwitterButton = styled(Button)`
  color: white;
  background: #1b9df0;
  border-color: #1b9df0;
  font-weight: bold;
  justify-content: center !important;
  & > span {
    font-size: 16px;
    margin-right: 32px;
    white-space: nowrap;
  }
  & > svg {
    font-size: 36px;
    max-height: 36px;
    max-width: 36px;
  }
`;

const RecruitSection = styled.div`
  animation: ${opacityTransition} 500ms normal forwards ease-out 750ms;
  opacity: 0;
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
  font-weight: bold;
  justify-content: center;
  text-shadow: 1px 2px 3px rgba(0, 0, 0, 1);
  text-transform: uppercase;
  white-space: nowrap;
  & > * {
    color: #BBB;
    transition: color 100ms ease;
  }
  & > span {
    margin-left: 4px; 
  }
  &:hover > * {
    color: #EEE;
  }
`;

const FinishContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-right: 12px;
  & > button {
    text-transform: uppercase;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-bottom: 12px;
  }
`;

const CrewAssignmentComplete = (props) => {
  const { account } = useWeb3React();
  const { id: sessionId } = useParams();
  const history = useHistory();
  const { data: allCrew } = useOwnedCrew();
  const { storyState } = useStorySession(sessionId);

  const onCloseDestination = useMemo(() => `/crew-assignments/${storyState?.book}`, [storyState?.book]);

  const crew = useMemo(() => {
    return allCrew && storyState && allCrew.find(({ i }) => i === storyState.owner);
  }, [storyState, allCrew]);

  const reward = useMemo(() => {
    return (storyState?.objective && toCrewTrait(storyState.objective)) || null;
  }, [storyState?.objective]);

  const shareOnTwitter = useCallback(() => {
    const params = new URLSearchParams({
      text: [
        `I just completed Crew Assignment: "${storyState.title}"`,
        `Be one of the first to join @influenceth and explore Adalia today!`,
        `Join Now:`,
      ].join('\n\n'),
      hashtags: 'PlayToEarn,NFTGaming',
      url: `${process.env.REACT_APP_API_URL}/og/crew-assignment/${sessionId}/${account}`,
      //via: 'influenceth'
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`);
  }, [account, sessionId, storyState]);
  
  const handleFinish = useCallback(() => {
    history.push(onCloseDestination);
  }, [history, onCloseDestination]);

  const slideOutContents = useMemo(() => {
    if (!storyState) return null;
    return (
      <>
        {reward && (
          <RewardSection>
            <div>
              <h4>This crew member has gained traits:</h4>
              <div>
                <RewardIcon />
                <div style={{ flex: 1 }}>
                  <b>{reward.name}</b>
                  <span>{reward.description}</span>
                </div>
              </div>
            </div>
          </RewardSection>
        )}
        <RecruitSection>
          <TwitterButton onClick={shareOnTwitter}>
            <span>Share on Twitter</span>
            <TwitterIcon />
          </TwitterButton>
          <CopyReferralLink>
            <LinkWithIcon>
              <LinkIcon />
              <span>Copy Recruitment Link</span>
            </LinkWithIcon>
          </CopyReferralLink>
        </RecruitSection>
      </>
    );
  }, [reward, shareOnTwitter, storyState]);

  if (!storyState || !crew) return null;
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
            <div>
              <CrewCard crew={crew} />
            </div>
          </CardContainer>
          <SlideOut>
            {slideOutContents}
          </SlideOut>
        </div>
      </ImageryContainer>

      <FinishContainer>
        <Button onClick={handleFinish}>Finish</Button>
      </FinishContainer>
    </Details>
  );
};

export default CrewAssignmentComplete;
