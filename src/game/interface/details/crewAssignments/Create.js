import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import {
  toCrewClass,
  toCrewClassDescription,
  toCrewCollection,
  toCrewTitle,
  toCrewTrait
} from 'influence-utils';
import {
  BiUndo as UndoIcon,
  BiRedo as RedoIcon
} from 'react-icons/bi';

import Button from '~/components/Button';
import CopyReferralLink from '~/components/CopyReferralLink';
import CrewCard from '~/components/CrewCard';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import Details from '~/components/Details';
import { LinkIcon, TwitterIcon } from '~/components/Icons';
import IconButton from '~/components/IconButton';
import TriangleTip from '~/components/TriangleTip';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStorySession from '~/hooks/useStorySession';
import api from '~/lib/api';
import CrewClassIcon from '~/components/CrewClassIcon';
import TextInput from '~/components/TextInput';


const slideOutTransition = keyframes`
  0% {
    color: transparent;
    transform: scaleX(0);
  }
  50% {
    color: transparent;
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(1);
    width: calc(95% - 120px);
  }
`;

// TODO: (for mobile)
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
  background: rgba(0, 0, 0, 0.8);
  padding: 24px 0;
`;
const Title = styled.div`
  border: solid #555;
  border-width: 1px 0;
  color: white;
  display: flex;
  font-size: 40px;
  font-weight: light;
  line-height: 40px;
  justify-content: center;
  margin: 0 auto;
  overflow: visible;
  padding: 12px 0;
  text-transform: uppercase;
  white-space: nowrap;
  width: 250px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    white-space: normal;
  }
`;

const ImageryContainer = styled.div`
  display: flex;
  flex: 1;
  padding: 75px 0 0;
  position: relative;

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
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-top: 15px;
  }
`;
const CardWrapper = styled.div`
  align-items: center;  
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 15px;
  position: relative;
  justify-content: center;
  width: 100%;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 20px 0;
  }
`;

const CardContainer = styled.div`
  background: black;
  padding: 8px;
  position: relative;
  z-index: 3;
  & > div {
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.35);
    max-width: 100%;
    padding: 4px;
    width: 312px;
  }
`;


const traitHeight = 170;
const traitBackground = 'rgba(15,15,15,0.95)';
const traitBorder = '#444';

const Traits = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  z-index: 2;
`;

const TraitRow = styled.div`
  background: ${traitBackground};
  display: flex;
  flex-direction: row;
  height: ${traitHeight}px;
  margin: 8px 0;
  overflow: visible;
  transform: scaleX(0);
  width: calc(95% - 120px);

  &:first-child {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 500ms;
  }
  &:last-child {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 650ms;
  }
`;

const TraitSpacer = styled.div`
  width: 312px; // (should match card width)
`;

const TipHolder = styled.div`
  position: absolute;
  top: 0;
  & > svg {
    height: 60px;
    width: ${traitHeight}px;
    & > polygon {
      fill: ${traitBackground};
    }
    & > path {
      stroke: ${traitBorder};
    }
  }
`;

const Trait = styled.div`
  position: relative;
  border: solid ${traitBorder};
  border-width: 1px 0;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;

  & > *:first-child {
    ${p => p.side === 'right' && 'margin-left: 20px;'}
    font-size: ${p => p.isClass ? `64px` : `80px`};
    line-height: ${p => p.isClass ? `64px` : `80px`};
    position: relative;
    text-align: center;
    width: 88px;
    z-index: 3;
  }
  & > article {
    flex: 1;
    padding-left: 10px;
    ${p => p.side === 'left' && 'padding-right: 20px;'}
    & > h4 {
      margin: 0 0 8px;
    }
    & > div {
      font-size: 80%;
      opacity: 0.6;
    }
  }

  & ${TipHolder} {
    ${p => p.side}: 0;
    & > svg {
      transform-origin: top ${p => p.side};
    }
  }
`;

const NameSection = styled.div`
  animation: ${opacityTransition} 1000ms normal forwards ease-out 650ms;
  opacity: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  & > input {
    background: #111;
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.35);
    font-size: 28px;
    height: 2em;
    text-align: center;
    width: 440px;
  }
`;

const RerollContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 8px;

  & > button {
    margin-right: 0;
    &:nth-child(odd) {
      border: 0;
    }
    &:nth-child(2) {
      margin: 0 8px;
      padding-left: 20px;
      padding-right: 20px;
      text-transform: uppercase;
      width: auto;
    }
  }
`;

const RecruitSection = styled.div`
  animation: ${opacityTransition} 500ms normal forwards ease-out 750ms;
  opacity: 0;
  & button {
    display: flex;
    height: 66px;
    justify-content: space-between;
    margin: 0 auto 10px;
    text-transform: uppercase;
    width: 280px;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-bottom: 16px;
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

const LinkWithIcon = styled.a`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 80%;
  font-weight: bold;
  justify-content: center;
  text-shadow: 1px 2px 3px rgba(0, 0, 0, 1);
  text-transform: uppercase;
  white-space: nowrap;
  & > * {
    color: #777;
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
  padding-bottom: 25px;
  padding-right: 35px;
  text-align: right;
  & > button {
    display: inline-block;
    text-transform: uppercase;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-bottom: 12px;
    padding-right: 24px;
  }
`;

const CrewAssignmentCreate = (props) => {
  const { account } = useWeb3React();
  const { id: sessionId } = useParams();
  const history = useHistory();
  const { storyState } = useStorySession(sessionId);

  // TODO: don't show anything until first features loaded
  // TODO: don't show this page if NOT origin story

  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureOptions, setFeatureOptions] = useState([]);
  const [featureSelection, setFeatureSelection] = useState();
  const [name, setName] = useState([]);


  const crewClassFromStory = 4;

  const onCloseDestination = `/owned-crew`;

  const rewards = useMemo(() => {
    return (storyState?.objectives || [1,22,33]).map((id) => ({
      id,
      ...toCrewTrait(id)
    }));
  }, [storyState?.objectives]);

  const shareOnTwitter = useCallback(() => {
    // TODO: ...
    const params = new URLSearchParams({
      text: [
        `I just minted an Adalian Citizen.`,
        `Be one of the first to join @influenceth and explore Adalia today!`,
        `Join Now:`,
      ].join('\n\n'),
      hashtags: 'PlayToEarn,NFTGaming',
      url: `${document.location.origin}/play/crew-assignment/${sessionId}?r=${account}`,
      //via: 'influenceth'
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`);
  }, [account, sessionId, storyState]);
  
  const handleFinish = useCallback(() => {
    history.push(onCloseDestination);
  }, [history, onCloseDestination]);

  const handleNameChange = useCallback((newName) => {
    setName(newName);
  }, []);

  const rerollAppearance = useCallback(async () => {
    const sex = Math.ceil(Math.random() * 2);
    const facialFeature = sex === 1 ? [0, 1, 3, 4, 5, 6, 7] : [0, 1, 2];
    const hair = sex === 1 ? [0, 1, 2, 3, 4, 5] : [0, 6, 7, 8, 9, 10, 11];

    const params = {
      crewCollection: 4,
      sex,
      body: (sex - 1) * 6 + Math.ceil(Math.random() * 6),
      crewClass: crewClassFromStory,
      title: 0,
      // [by class] 1: [19,20], 2: [21,22], 3: [23,24], 4: [25,26], 5: [27,28]
      outfit: 18 + (crewClassFromStory - 1) * 2 + Math.ceil(Math.random() * 2),
      hair: hair[Math.floor(Math.random() * hair.length)],
      facialFeature: facialFeature[Math.floor(Math.random() * facialFeature.length)],
      hairColor: Math.ceil(Math.random() * 5),
      headPiece: 0,
      bonusItem: 0
    };

    setFeatureOptions([
      ...featureOptions,
      params
    ]);
    setFeatureSelection(featureOptions.length);
  }, [featureOptions.length]);

  const rollBack = useCallback(() => {
    setFeatureSelection(Math.max(0, featureSelection - 1));
  }, [featureSelection]);

  const rollForward = useCallback(() => {
    setFeatureSelection(Math.min(featureOptions.length - 1, featureSelection + 1));
  }, [featureSelection]);

  const finalize = useCallback(() => {
    // order of features (object is already in order, just call Object.values):
    // [ collection, sex, body, class, title, outfit, hair, facialFeatures, hairColor, headPiece, item ]
  });

  useEffect(() => {
    rerollAppearance();
  }, []);

  // draft crew
  const crew = {
    crewClass: crewClassFromStory,
    traits: [], // TODO: fill in from objectives
    ...featureOptions[featureSelection]
  };

  console.log('rewards');

  const finalized = false;

  const rewardTipAttrs = {
    strokeWidth: 1
  }
  if (!storyState) return null;
  return (
    <Details
      onCloseDestination={onCloseDestination}
      contentProps={{ style: { display: 'flex', flexDirection: 'column', } }}
      edgeToEdge
      title="Crew Assignments">
      <ImageryContainer src={storyState.image}>
        <div />
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
          {finalized && (
            <TitleBox>
              <Title>Crewmate Created</Title>
            </TitleBox>
          )}
          <div>
            <CardWrapper>
              <CardContainer>
                <div>
                  <CrewCard
                    crew={crew}
                    hideFooter={!finalized}
                    largerClassIcon={!finalized} />
                </div>
              </CardContainer>
              {!finalized && (
                <Traits>
                  <TraitRow>
                    <Trait side="left" isClass>
                      <div>
                        <span>
                          <CrewClassIcon crewClass={crew.crewClass} overrideColor="inherit" />
                        </span>
                      </div>
                      <article>
                        <h4>{toCrewClass(crew.crewClass)}</h4>
                        <div>{toCrewClassDescription(crew.crewClass)}</div>
                      </article>
                      <TipHolder>
                        <TriangleTip {...rewardTipAttrs} rotate="90" />
                      </TipHolder>
                    </Trait>

                    <TraitSpacer />
                    
                    <Trait side="right">
                      <div>
                        <CrewTraitIcon trait={rewards[0].id} />
                      </div>
                      <article>
                        <h4>{rewards[0].name}</h4>
                        <div>{rewards[0].description}</div>
                      </article>
                      <TipHolder>
                        <TriangleTip {...rewardTipAttrs} rotate="-90" />
                      </TipHolder>
                    </Trait>
                  </TraitRow>

                  <TraitRow>
                    <Trait side="left">
                      <div>
                        <CrewTraitIcon trait={rewards[1].id} />
                      </div>
                      <article>
                        <h4>{rewards[1].name}</h4>
                        <div>{rewards[1].description}</div>
                      </article>
                      <TipHolder side="left">
                        <TriangleTip {...rewardTipAttrs} rotate="90" />
                      </TipHolder>
                    </Trait>

                    <TraitSpacer />

                    <Trait side="right">
                      <div>
                        <CrewTraitIcon trait={rewards[2].id} />
                      </div>
                      <article>
                        <h4>{rewards[2].name}</h4>
                        <div>{rewards[2].description}</div>
                      </article>
                      <TipHolder side="right">
                        <TriangleTip {...rewardTipAttrs} rotate="-90" />
                      </TipHolder>
                    </Trait>
                  </TraitRow>
                </Traits>
              )}
            </CardWrapper>

            {!finalized && (
              <NameSection>
                <TextInput onChange={handleNameChange} placeholder="Enter Name" />
                <RerollContainer>
                  <IconButton
                    onClick={rollBack}
                    disabled={featureSelection === 0}
                    style={{ opacity: featureOptions.length > 1 ? 1 : 0 }}>
                    <UndoIcon />
                  </IconButton>
                  
                  <Button onClick={rerollAppearance}>Re-roll Appearance</Button>
                  
                  <IconButton
                    onClick={rollForward}
                    disabled={featureSelection === featureOptions.length - 1}
                    style={{ opacity: featureOptions.length > 1 ? 1 : 0 }}>
                    <RedoIcon />
                  </IconButton>
                </RerollContainer>
              </NameSection>
            )}
            {finalized && (
              <RecruitSection>
                {!process.env.REACT_APP_HIDE_SOCIAL && (
                  <TwitterButton onClick={shareOnTwitter}>
                    <span>Share on Twitter</span>
                    <TwitterIcon />
                  </TwitterButton>
                )}
                <CopyReferralLink>
                  <LinkWithIcon>
                    <LinkIcon />
                    <span>Copy Recruitment Link</span>
                  </LinkWithIcon>
                </CopyReferralLink>
              </RecruitSection>
            )}
          </div>
          {/* NOTE: the below empty div's are to help with flex spacing on tall screens */}
          <div />
          <div />
        </div>
      </ImageryContainer>

      <FinishContainer>
        <Button onClick={handleFinish}>Finish</Button>
      </FinishContainer>
    </Details>
  );
};

export default CrewAssignmentCreate;
