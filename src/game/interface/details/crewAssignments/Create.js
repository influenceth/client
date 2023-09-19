import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Crewmate, Entity } from '@influenceth/sdk';
import {
  BiUndo as UndoIcon,
  BiRedo as RedoIcon
} from 'react-icons/bi';
import LoadingAnimation from 'react-spinners/PuffLoader';

import Button from '~/components/ButtonAlt';
import ConfirmationDialog from '~/components/ConfirmationDialog';
import CopyReferralLink from '~/components/CopyReferralLink';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import Details from '~/components/DetailsModal';
import Dialog from '~/components/Dialog';
import Ether from '~/components/Ether';
import { AdalianIcon, CheckIcon, LinkIcon, TwitterIcon } from '~/components/Icons';
import IconButton from '~/components/IconButton';
import TextInput from '~/components/TextInput';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useBookSession, { bookIds } from '~/hooks/useBookSession';
import useCrewManager from '~/hooks/useCrewManager';
import useCrewContext from '~/hooks/useCrewContext';
import useNameAvailability from '~/hooks/useNameAvailability';
import usePriceConstants from '~/hooks/usePriceConstants';
import formatters from '~/lib/formatters';
import { boolAttr } from '~/lib/utils';

const blinkingBackground = (p) => keyframes`
  0% {
    background-color: #000;
  }
  50% {
    background-color: rgba(${p.theme.colors.mainRGB}, 0.2);
  }
  100% {
    background-color: #000;
  }
`;

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
// const mobileSlideOutTransition = keyframes`
//   0% {
//     transform: scaleX(0);
//   }
//   50% {
//     transform: scaleX(1);
//   }
//   100% {
//     transform: scaleX(1);
//   }
// `;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  75% { opacity: 0; }
  100% { opacity: 1; }
`;

const TitleBox = styled.div`
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 0;
`;
const Title = styled.div`
  border: solid #444;
  border-width: 1px 0;
  color: white;
  display: flex;
  font-size: 32px;
  font-weight: light;
  line-height: 40px;
  justify-content: center;
  margin: 0 auto;
  overflow: visible;
  padding: 24px 0;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  width: calc(100% - 180px);

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
    opacity: 0.5;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, rgba(0,0,0,0.7) 50%, transparent 100%);
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

const cardWidth = 360;
const traitHeight = 150;
const traitMargin = 2;
const traitBackground = 'rgba(15,15,15,0.95)';
const traitBorder = '#444';

const CardWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  min-height: ${(traitHeight + 2 * traitMargin) * 3}px;
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
    padding: 4px;
    width: ${cardWidth}px;
    @media (min-width: 1024px) {
      max-width: 22vw;
    }
  }
`;

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

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const TraitRow = styled.div`
  background: ${traitBackground};
  display: flex;
  flex-direction: row;
  height: ${traitHeight}px;
  margin: ${traitMargin}px 0;
  overflow: visible;
  transform: scaleX(0);
  width: calc(95% - 120px);

  &:nth-child(1) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 500ms;
  }
  &:nth-child(2) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 650ms;
  }
  &:nth-child(3) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 800ms;
  }
`;

const TraitSpacer = styled.div`
  border: solid ${traitBorder};
  border-width: 1px 0;
  max-width: 22vw;
  width: ${cardWidth}px; // (should match card width)
`;

const TipHolder = styled.div`
  position: absolute;
  top: 0;
  & > svg {
    height: 60px;
    width: ${traitHeight - 1}px;
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
    font-size: ${p => p.isCrewClass ? '64px' : '80px'};
    line-height: ${p => p.isCrewClass ? '64px' : '80px'};
    position: relative;
    text-align: center;
    width: 88px;
    z-index: 3;
  }
  & > article {
    flex: 1;
    max-height: 100%;
    overflow: hidden;
    padding-bottom: 10px;
    padding-left: 10px;
    padding-top: 10px;
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

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    border: 0;
    padding-bottom: 16px;
    & > *:first-child {
      font-size: ${p => p.isCrewClass ? '52px' : '64px'};
      line-height: ${p => p.isCrewClass ? '52px' : '64px'};
      width: 72px;
    }
  }

  @media (max-width: 1500px) {
    & > *:first-child {
      width: 72px;
    }
    & > article {
      font-size: 90%;
    }
  }
  @media (min-width: 1024px) and (max-width: 1400px) {
    & > *:first-child {
      display: none;
    }
    & > article {
      padding-left: 20px;
    }
  }
`;

const NameSection = styled.div`
  animation: ${opacityTransition} 1000ms normal forwards ease-out 650ms;
  opacity: 0;
  display: flex;
  margin-top: 5px;
  flex-direction: column;
  align-items: center;
  & > input {
    &:not(:disabled) {
      animation: ${blinkingBackground} 750ms linear 2000ms 2;
    }
    background: #000;
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.35);
    font-size: 28px;
    height: 2em;
    text-align: center;
    width: 440px;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-top: -10px;
    padding: 0 8px;
    width: 100%;
    & > input {
      max-width: 440px;
      width: 100%;
    }
  }
`;

const RandomizeControls = styled(IconButton)`
  margin-right: 0;
  border: 0;
`;

const RandomizeButton = styled(Button)`
  margin: 0 8px;
`;

const RerollContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 10px;
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

  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    & > *:first-child {
      display: none;
    }
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    justify-items: flex-end;

    padding-bottom: 12px;
    padding-left: 8px;
    padding-right: 8px;
  }
`;

const PromptBody = styled.div`
  border: solid #333;
  border-width: 1px 0;
  padding: 16px 24px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 12px;
  }

  & h4 {
    color: ${p => p.theme.colors.success};
    font-weight: normal;
    margin-bottom: 0;
    text-align: right;
  }
`;

const Rule = styled.div`
  height: 0;
  border-bottom: 1px solid #333;
`;

const Footer = styled.div`
  background: black;
  padding: 0 35px;
  height: 80px;
`;

const RecruitTally = styled.div`
  color: ${p => p.theme.colors.main};
  margin-right: 16px;
  & b {
    color: white;
    font-weight: normal;
  }
`;

const onCloseDestination = `/crew`;

const getRandomAdalianAppearance = () => {
  const gender = Math.ceil(Math.random() * 2);
  const faces = gender === 1 ? [0, 1, 3, 4, 5, 6, 7] : [0, 1, 2];
  const hairs = gender === 1 ? [0, 1, 2, 3, 4, 5] : [0, 6, 7, 8, 9, 10, 11];
  return {
    gender,
    body: (gender - 1) * 6 + Math.ceil(Math.random() * 6),
    face: faces[Math.floor(Math.random() * faces.length)],
    hair: hairs[Math.floor(Math.random() * hairs.length)],
    hairColor: Math.ceil(Math.random() * 5),
    // clothes: 31 + (crewClass - 1) * 2 + Math.ceil(Math.random() * 2),
    clothesOffset: 31 + Math.ceil(Math.random() * 2),
    head: 0,
    item: 0
  };
};

const getRandomTraitSet = (c) => {
  if (!(c.Crewmate.coll || c.Crewmate.class)) return [];

  const traits = [];  // TODO: if traits are partially selected, just randomize the rest; if full or empty, randomize all
  let possibleTraits = Crewmate.nextTraits(c.Crewmate.coll, c.Crewmate.class, traits);
  let randomIndex;
  while (possibleTraits.length > 0 && traits.length < 12) {
    randomIndex = Math.floor(Math.random() * possibleTraits.length);
    traits.push(possibleTraits[randomIndex]);
    console.log({ possibleTraits, randomIndex, traits});
    possibleTraits = Crewmate.nextTraits(c.Crewmate.coll, c.Crewmate.class, traits);
  }

  return {
    impactful: [],
    cosmetic: [],
  }
};

const CrewAssignmentCreate = (props) => {
  const { account } = useAuth();
  const { bookId, crewmateId } = useParams();
  const history = useHistory();

  const { bookError, bookSession, storySession, undoPath, restart } = useBookSession(bookId, crewmateId);
  const isNameValid = useNameAvailability(Entity.IDS.CREWMATE);
  const { purchaseAndOrInitializeCrew, getPendingCrewmate, adalianRecruits } = useCrewManager();
  const { crew, crewmateMap } = useCrewContext();
  const { data: priceConstants } = usePriceConstants();

  const [confirming, setConfirming] = useState();

  const [appearanceOptions, setAppearanceOptions] = useState([]);
  const [appearanceSelection, setAppearanceSelection] = useState();

  const [traitSetOptions, setTraitSetOptions] = useState([]);
  const [traitSetSelection, setTraitSetSelection] = useState();

  const [finalizing, setFinalizing] = useState();
  const [finalized, setFinalized] = useState();
  const [name, setName] = useState('');
  const [traitDetailsOpen, setTraitDetailsOpen] = useState(false);

  const pendingCrewmate = useMemo(() => getPendingCrewmate(), [getPendingCrewmate]);
  const [selectedClass, setSelectedClass] = useState(
    pendingCrewmate?.Crewmate?.class
    || bookSession?.crewmate?.Crewmate?.class
    || bookSession?.selectedClass
  );

  useEffect(() => {
    if (bookError) history.push(onCloseDestination);
  }, [bookError, onCloseDestination]);

  // derive crewmate-structured crewmate based on selections
  const crewmate = useMemo(() => {

    // if already finalized, return final version
    if (finalized) return finalized;

    // if already pending, format from pending tx
    if (pendingCrewmate) {
      console.log('TODO: update id and coll here if available', pendingCrewmate);
      const { name, hair_color, caller_crew, ...crewmateVars } = pendingCrewmate.vars;
      crewmateVars.coll = hair_color; // TODO: this 
      crewmateVars.hairColor = hair_color;
      crewmateVars.appearance = Crewmate.packAppearance(crewmateVars);
      return {
        id: 0, // TODO: 
        label: Entity.IDS.CREWMATE,
        Control: {
          controller: {
            id: caller_crew,
            label: Entity.IDS.CREWMATE,
          }
        },
        Crewmate: {
          ...crewmateVars
        },
        Name: { name },
        _finalizing: true
      };
    }

    // if get here, there must be a bookSession...
    if (!bookSession) return null;

    // default from bookSession crewmate (arvadian) or from empty adalian
    const c = bookSession.crewmate || {
      id: 0,
      label: Entity.IDS.CREWMATE,
      Crewmate: {
        coll: Crewmate.COLLECTION_IDS.ADALIAN
      }
    };

    // always force control to current crew
    c.Control = {
      controller: {
        id: crew?.id || 0,
        label: Entity.IDS.CREWMATE,
      }
    }

    // initialize things if not set
    if (!c.Crewmate.coll) c.Crewmate.coll = bookId === bookIds.ADALIAN_RECRUITMENT ? Crewmate.COLLECTION_IDS.ADALIAN : Crewmate.COLLECTION_IDS.ARVAD_CITIZEN;
    if (!c.Crewmate.class) {
      c.Crewmate.class = selectedClass || 1;// TODO: remove `|| 1`
      c._canReclass = true;
    }
    if (!c.Name?.name) {
      c.Name = { name };
      c._canRename = true;
    }

    // get traits selected
    if (!c.Crewmate.cosmetic || !c.Crewmate.impactful) {
      // from random
      if (traitSetOptions.length && traitSetSelection) {
        c.Crewmate.cosmetic = traitSetOptions[traitSetSelection]?.cosmetic;
        c.Crewmate.impactful = traitSetOptions[traitSetSelection]?.impactful;

      // from story
      } else if (bookSession?.selectedTraits) {
        c.Crewmate.cosmetic = bookSession.selectedTraits.filter((t) => Crewmate.TRAITS[t].type === Crewmate.TRAIT_TYPES.COSMETIC);
        c.Crewmate.impactful = bookSession.selectedTraits.filter((t) => Crewmate.TRAITS[t].type === Crewmate.TRAIT_TYPES.IMPACTFUL);
      }
    }

    // get appearance
    if (!c.Crewmate.appearance) {
      if (appearanceOptions.length) {
        const { clothesOffset, ...appearance } = appearanceOptions[appearanceSelection];
        c.Crewmate.appearance = Crewmate.packAppearance({
          ...appearance,
          clothes: c.Crewmate.class ? (c.Crewmate.class - 1) * 2 + clothesOffset : 18
        });
      }
      c._canRerollAppearance = true;
    }

    return c;
  }, [
    appearanceOptions,
    appearanceSelection,
    name,
    pendingCrewmate,
    traitSetOptions,
    traitSetSelection,
    bookSession
  ]);

  // init appearance options as desired
  useEffect(() => {
    if (crewmate && !crewmate.Crewmate.appearance && appearanceOptions?.length === 0) {
      setAppearanceOptions([getRandomAdalianAppearance()]);
      setAppearanceSelection(0);
    }
  }, [!!crewmate, appearanceOptions?.length]);

  // handle finalizing
  useEffect(() => {
    if (crewmate?._finalizing) setFinalizing(true);
  }, [crewmate?._finalizing]);

  // handle finalized
  useEffect(() => {
    if (finalizing) {
      const finalizedCrewmate = Object.values(crewmateMap).find((c) => c.Name.name === name);
      if (finalizedCrewmate) {
        setFinalizing(false);
        setFinalized(finalizedCrewmate);
      }
      // TODO (enhancement): after timeout, show error
    }
  }, [ crewmateMap, finalizing ]);

  useEffect(() => {
    console.log('getRandomTraitSet', getRandomTraitSet(crewmate));
  }, [])

  const shareOnTwitter = useCallback(() => {
    // TODO: ...
    const params = new URLSearchParams({
      text: [
        `I just minted an Adalian Citizen.`,
        `Be one of the first to join @influenceth and explore Adalia today!`,
        `Join Now:`,
      ].join('\n\n'),
      hashtags: 'PlayToEarn,NFTGaming',
      url: `${document.location.origin}/play/crew-assignment/${bookId}?r=${account}`,
      //via: 'influenceth'
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank');
  }, [account, bookId]);

  const handleFinish = useCallback(() => {
    history.push(onCloseDestination);
  }, [history]);

  const handleNameChange = useCallback((newName) => {
    setName(newName);
  }, []);

  const rerollAppearance = useCallback(async () => {
    setAppearanceOptions((prevValue) => {
      setAppearanceSelection((prevValue || []).length);
      return [...(prevValue || []), getRandomAdalianAppearance()]
    });
  }, []);

  const rollBackAppearance = useCallback(() => {
    setAppearanceSelection(Math.max(0, appearanceSelection - 1));
  }, [appearanceSelection]);

  const rollForwardAppearance = useCallback(() => {
    setAppearanceSelection(Math.min(appearanceOptions.length - 1, appearanceSelection + 1));
  }, [appearanceOptions.length, appearanceSelection]);

  const rerollTraits = useCallback(async () => {
    if (!crewmate?.Crewmate?.class) return;
    setTraitSetOptions((prevValue) => {
      setTraitSetSelection((prevValue || []).length);
      return [...(prevValue || []), getRandomTraitSet(crewmate?.Crewmate?.class)]
    });
  }, [crewmate?.Crewmate?.class]);

  const rollBackTraits = useCallback(() => {
    setTraitSetSelection(Math.max(0, traitSetSelection - 1));
  }, [traitSetSelection]);

  const rollForwardTraits = useCallback(() => {
    setTraitSetSelection(Math.min(setTraitSetOptions.length - 1, traitSetSelection + 1));
  }, [setTraitSetOptions.length, traitSetSelection]);

  const confirmFinalize = useCallback(async () => {
    if (await isNameValid(name)) {
      setConfirming(true);
    }
  }, [isNameValid, name]);

  const finalize = useCallback(() => {
    setConfirming(false);
    purchaseAndOrInitializeCrew({
      crewmate,
      crewId: crew?.id || 0,
      // sessionId // used to tag the pendingTransaction  // TODO: deprecate? use bookId? use random?
    });
  }, [crewmate, purchaseAndOrInitializeCrew, crew?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    history.push(`/crew-assignment/${bookId}/${crewmateId}/`);
  }, []);

  // show "complete" page (instead of "create") for non-recruitment assignments
  useEffect(() => {
    if (bookSession && !bookSession.isMintingStory) {
      history.push(`/crew-assignment/${bookId}/${crewmateId}/complete`);
    }
  }, [!!bookSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // hide until loaded
  const loading = !crewmate;
  const finalizedz = false;
  return (
    <Details
      edgeToEdge
      headerProps={{ background: 'true', v2: 'true' }}
      onCloseDestination={onCloseDestination}
      contentInnerProps={{ style: { display: 'flex', flexDirection: 'column', height: '100%' } }}
      title="Crewmate Recruitment"
      width="1150px">
      {loading && (
        <div style={{ position: 'absolute', left: 'calc(50% - 30px)', top: 'calc(50% - 30px)' }}>
          <LoadingAnimation color="white" loading />
        </div>
      )}
      {!loading && (
        <>
          <ImageryContainer src={storySession.completionImage || storySession.image}>
            <div />
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
              {finalizedz && (
                <>
                  <TitleBox>
                    <Title>Crewmate Recruited</Title>
                  </TitleBox>
                  <div>
                    <CardWrapper>
                      <CardContainer>
                        <div>
                          <CrewCard
                            crewmate={crewmate}
                            fontSize="25px"
                            noWrapName
                            showClassInHeader />
                        </div>
                      </CardContainer>
                    </CardWrapper>

                    {/* 
                    <RecruitSection>
                      {!process.env.REACT_APP_HIDE_SOCIAL && (
                        <TwitterButton onClick={shareOnTwitter}>
                          <span>Share on Twitter</span>
                          <TwitterIcon />
                        </TwitterButton>
                      )}
                    </RecruitSection>
                    */}
                  </div>
                </>
              )}
              {!finalizedz && (
                <div>
                  <CardWrapper>
                    <CardContainer>
                      <div>
                        <CrewCard
                          crewmate={crewmate}
                          fontSize="25px"
                          hideCollectionInHeader
                          hideFooter
                          hideIfNoName
                          noWrapName={finalized}
                          showClassInHeader={finalized} />
                      </div>
                    </CardContainer>
                    {!finalized && (
                      <Traits>
                        {crewmate.Crewmate?.class && (
                          <TraitRow>
                            <Trait side="left" isCrewClass>
                              <div>
                                <CrewClassIcon crewClass={crewmate.Crewmate.class} overrideColor="inherit" />
                              </div>
                              <article>
                                <h4>{Crewmate.getClass(crewmate.Crewmate.class).name}</h4>
                                <div>{Crewmate.getClass(crewmate.Crewmate.class).description}</div>
                              </article>
                              <TipHolder>
                                <TriangleTip strokeWidth="1" rotate="90" />
                              </TipHolder>
                            </Trait>

                            <TraitSpacer />

                            <Trait side="right" isCrewClass>
                              <div>
                                <AdalianIcon />
                              </div>
                              <article>
                                <h4>Adalian Citizen</h4>
                                <div>Completed secondary education and entered adulthood in the Adalian System, after the dismantling of the Arvad.</div>
                              </article>
                              <TipHolder>
                                <TriangleTip strokeWidth="1" rotate="-90" />
                              </TipHolder>
                            </Trait>
                          </TraitRow>
                        )}
  {/* 
                        <TraitRow>
                          <Trait side="left">
                            <div>
                              <CrewTraitIcon trait={rewards[traitDispOrder[0]]?.id} type={rewards[traitDispOrder[0]]?.type} />
                            </div>
                            <article>
                              <h4>{rewards[traitDispOrder[0]]?.name}</h4>
                              <div>{rewards[traitDispOrder[0]]?.description}</div>
                            </article>
                            <TipHolder>
                              <TriangleTip strokeWidth="1" rotate="90" />
                            </TipHolder>
                          </Trait>

                          <TraitSpacer />

                          <Trait side="right">
                            <div>
                              <CrewTraitIcon trait={rewards[traitDispOrder[1]]?.id} type={rewards[traitDispOrder[1]]?.type} />
                            </div>
                            <article>
                              <h4>{rewards[traitDispOrder[1]]?.name}</h4>
                              <div>{rewards[traitDispOrder[1]]?.description}</div>
                            </article>
                            <TipHolder>
                              <TriangleTip strokeWidth="1" rotate="-90" />
                            </TipHolder>
                          </Trait>
                        </TraitRow>

                        <TraitRow>
                          <Trait side="left">
                            <div>
                              <CrewTraitIcon trait={rewards[traitDispOrder[2]]?.id} type={rewards[traitDispOrder[2]]?.type} />
                            </div>
                            <article>
                              <h4>{rewards[traitDispOrder[2]]?.name}</h4>
                              <div>{rewards[traitDispOrder[2]]?.description}</div>
                            </article>
                            <TipHolder side="left">
                              <TriangleTip strokeWidth="1" rotate="90" />
                            </TipHolder>
                          </Trait>

                          <TraitSpacer />

                          <Trait side="right">
                            <div>
                              <CrewTraitIcon trait={rewards[traitDispOrder[3]]?.id} type={rewards[traitDispOrder[3]]?.type} />
                            </div>
                            <article>
                              <h4>{rewards[traitDispOrder[3]]?.name}</h4>
                              <div>{rewards[traitDispOrder[3]]?.description}</div>
                            </article>
                            <TipHolder side="right">
                              <TriangleTip strokeWidth="1" rotate="-90" />
                            </TipHolder>
                          </Trait>
                        </TraitRow>*/}
                      </Traits>
                    )}
                  </CardWrapper>

                  <NameSection>
                    {crewmate._canRename && (
                      <TextInput
                        disabled={finalizing || !crewmate._canRename}
                        initialValue={name}
                        maxlength={31}
                        onChange={handleNameChange}
                        pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                        placeholder="Enter Name" />
                    )}

                    {crewmate._canRerollAppearance && (
                      <RerollContainer>
                        <RandomizeControls
                          onClick={rollBackAppearance}
                          disabled={finalizing || appearanceSelection === 0}
                          style={{ opacity: appearanceOptions.length > 1 ? 1 : 0 }}>
                          <UndoIcon />
                        </RandomizeControls>

                        <RandomizeButton
                          disabled={finalizing}
                          lessTransparent
                          onClick={rerollAppearance}>Randomize Appearance</RandomizeButton>

                        <RandomizeControls
                          onClick={rollForwardAppearance}
                          disabled={finalizing || appearanceSelection === appearanceOptions.length - 1}
                          style={{ opacity: appearanceOptions.length > 1 ? 1 : 0 }}>
                          <RedoIcon />
                        </RandomizeControls>
                      </RerollContainer>
                    )}
                  </NameSection>
                </div>
              )}
              {/* NOTE: the below empty div's are to help with flex spacing on tall screens */}
              <div />
              <div />
            </div>
          </ImageryContainer>

          <Footer>
            <Rule />
            <div style={{ alignItems: 'center', display: 'flex', height: 'calc(100% - 1px)', width: '100%' }}>
              {finalized && (
                <>
                  <CopyReferralLink>
                    <Button subtle><LinkIcon /> <span style={{ marginLeft: 4 }}>Copy Referral Link</span></Button>
                  </CopyReferralLink>
                  
                  <div style={{ flex: 1 }} />
                  <Button subtle onClick={() => history.push('/crew')}>Go to Crew</Button>
                </>
              )}
              {!finalized && (
                <>
                  <Button subtle onClick={handleBack}>Back</Button>
                  <div style={{ flex: 1 }} />
                  <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
                    <RecruitTally>Available Recruits: <b>1</b></RecruitTally>
                    <Button subtle isTransaction onClick={confirmFinalize}>Recruit</Button>
                  </div>
                </>
              )}
            </div>
          </Footer>
{/* 
          <FinishContainer>
            {!finalized && (
              <>
                <Button
                  onClick={() => setTraitDetailsOpen(true)}
                  style={{ width: 'auto' }}>
                  Review Traits
                </Button>
                <Button
                  disabled={boolAttr(finalizing || !name)}
                  loading={boolAttr(finalizing)}
                  isTransaction
                  onClick={confirmFinalize}>
                  Finalize
                </Button>
              </>
            )}
            {finalized && (
              <>
                <span />
                <Button
                  onClick={handleFinish}>
                  Finish
                </Button>
              </>
            )}
          </FinishContainer>
*/}
          {confirming && (
            <ConfirmationDialog
              title={`Confirm Character ${adalianRecruits.length > 0 ? 'Details' : 'Minting'}`}
              body={(
                <PromptBody>
                  The Crewmate you are about to create will be {adalianRecruits.length > 0 ? 'initialized' : 'minted'} as a new unique
                  Player-Owned Game Asset (POGA)! {adalianRecruits.length > 0 ? 'The ' : 'Once minted, the '}character can never be deleted
                  or unmade, and is yours to keep or trade forever. All of their stats,
                  actions, skills, and attributes will be appended to their unique history
                  and stored as independent on-chain events.
                  {adalianRecruits.length > 0 && (
                    <h4><CheckIcon /> {adalianRecruits.length} crew credit{adalianRecruits.length === 1 ? '' : 's'} remaining</h4>
                  )}
                </PromptBody>
              )}
              onConfirm={finalize}
              confirmText={(
                <>
                  Confirm
                  {adalianRecruits.length === 0 && priceConstants && (
                    <span style={{ flex: 1, fontSize: '90%', textAlign: 'right' }}>
                      {/* TODO: should this update price before "approve"? what about asteroids? */}
                      <Ether>{formatters.crewmatePrice(priceConstants)}</Ether>
                    </span>
                  )}
                </>
              )}
              onReject={() => setConfirming(false)}
              isTransaction
            />
          )}
        </>
      )}
    </Details>
  );
};

export default CrewAssignmentCreate;
