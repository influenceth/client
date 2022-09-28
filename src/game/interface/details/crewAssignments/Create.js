import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toCrewClass, toCrewClassDescription, toCrewTrait } from 'influence-utils';
import {
  BiUndo as UndoIcon,
  BiRedo as RedoIcon
} from 'react-icons/bi';

import Button from '~/components/Button';
import ConfirmationDialog from '~/components/ConfirmationDialog';
import CopyReferralLink from '~/components/CopyReferralLink';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import Details from '~/components/DetailsModal';
import Dialog from '~/components/Dialog';
import Ether from '~/components/Ether';
import { AdalianIcon, LinkIcon, TwitterIcon } from '~/components/Icons';
import IconButton from '~/components/IconButton';
import TextInput from '~/components/TextInput';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useCrewManager from '~/hooks/useCrewManager';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useSale from '~/hooks/useSale';
import useStore from '~/hooks/useStore';
import useStorySession from '~/hooks/useStorySession';
import formatters from '~/lib/formatters';

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
  text-align: center;
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

const RerollContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 10px;

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
`;

const MobileDialogContainer = styled.div`
  & > div > div {
    border: 2px solid ${p => p.theme.colors.main};
    padding: 20px 5px 10px;
    & button {
      margin: 0 0 0 auto;
    }
  }
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const onCloseDestination = `/owned-crew`;

const driveTraits = [1, 2, 3, 4];
const driveCosmeticTraits = [36, 37, 38, 39, 40];
const justCosmeticTraits = [5, 6, 7, 8, 9, 10, 13, 15, 16, 18, 20, 22];

const traitDispOrder = ['classImpactful', 'drive', 'cosmetic', 'driveCosmetic'];

const CrewAssignmentCreate = (props) => {
  const { account } = useAuth();
  const { id: sessionId } = useParams();
  const history = useHistory();
  const { storyState } = useStorySession(sessionId);
  const { purchaseAndInitializeCrew, getPendingPurchase } = useCrewManager();
  const { data: crew } = useOwnedCrew();
  const { data: crewSale } = useSale('Crewmate');
  const createAlert = useStore(s => s.dispatchAlertLogged);

  const [confirming, setConfirming] = useState();
  const [featureOptions, setFeatureOptions] = useState([]);
  const [featureSelection, setFeatureSelection] = useState();
  const [finalizing, setFinalizing] = useState();
  const [finalized, setFinalized] = useState();
  const [name, setName] = useState('');
  const [traitDetailsOpen, setTraitDetailsOpen] = useState(false);

  const rewards = useMemo(() => {
    if (storyState?.accruedTraits) {
      const traits = (storyState?.accruedTraits || []).map((id) => ({
        id,
        ...toCrewTrait(id)
      }));
      return {
        drive: traits.find((t) => driveTraits.includes(t.id)),
        classImpactful: traits.find((t) => t.type === 'impactful'),
        driveCosmetic: traits.find((t) => driveCosmeticTraits.includes(t.id)),
        cosmetic: traits.find((t) => justCosmeticTraits.includes(t.id)),
      };
    }
  }, [storyState?.accruedTraits]);

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
  }, [account, sessionId]);
  
  const handleFinish = useCallback(() => {
    history.push(onCloseDestination);
  }, [history]);

  const handleNameChange = useCallback((newName) => {
    setName(newName);
  }, []);

  const rerollAppearance = useCallback(async () => {
    const crewClass = storyState?.classObjective;
    if (!crewClass) return;

    const sex = Math.ceil(Math.random() * 2);
    const facialFeature = sex === 1 ? [0, 1, 3, 4, 5, 6, 7] : [0, 1, 2];
    const hair = sex === 1 ? [0, 1, 2, 3, 4, 5] : [0, 6, 7, 8, 9, 10, 11];

    const params = {
      crewCollection: 4,
      sex,
      body: (sex - 1) * 6 + Math.ceil(Math.random() * 6),
      crewClass,
      title: 0,
      outfit: 18 + (crewClass - 1) * 2 + Math.ceil(Math.random() * 2),
      hair: hair[Math.floor(Math.random() * hair.length)],
      facialFeature: facialFeature[Math.floor(Math.random() * facialFeature.length)],
      hairColor: Math.ceil(Math.random() * 5),
      headPiece: 0,
      bonusItem: 0
    };

    setFeatureOptions((prevValue) => {
      setFeatureSelection((prevValue || []).length);
      return [...(prevValue || []), params]
    });
  }, [storyState?.classObjective]);

  const rollBack = useCallback(() => {
    setFeatureSelection(Math.max(0, featureSelection - 1));
  }, [featureSelection]);

  const rollForward = useCallback(() => {
    setFeatureSelection(Math.min(featureOptions.length - 1, featureSelection + 1));
  }, [featureOptions.length, featureSelection]);

  const validateName = useCallback(() => {
    let err = '';
    if (name.length === 0) err = 'Name field cannot be empty.';
    else if (name.length > 31) err = 'Name is too long.';
    else if (/^ /.test(name) || / $/.test(name)) err = 'Name cannot have leading or trailing spaces.';
    else if (/ {2,}/.test(name)) err = 'Name cannot have adjoining spaces.';
    else if (/[^a-zA-Z0-9 ]/.test(name)) err = 'Name can only contain letters and numbers.';
    if (err) {
      createAlert({
        type: 'GenericAlert',
        content: err,
        level: 'warning',
        duration: 4000
      });
      return false;
    }
    return true;
  }, [createAlert, name]);

  const confirmFinalize = useCallback(() => {
    if (!validateName()) return;
    setConfirming(true);
  }, [validateName]);

  const finalize = useCallback(() => {
    setConfirming(false);
    const input = {
      name,
      features: featureOptions[featureSelection],
      traits: rewards,
      sessionId // used to tag the pendingTransaction
    };
    purchaseAndInitializeCrew(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, featureOptions?.length, featureSelection, purchaseAndInitializeCrew, !!rewards, sessionId]);

  // show "complete" page (instead of "create") for non-recruitment assignments
  useEffect(() => {
    if (storyState && !(storyState.tags || []).includes('ADALIAN_RECRUITMENT')) {
      history.push(`/crew-assignment/${sessionId}/complete`);
    }
  }, [!!storyState]); // eslint-disable-line react-hooks/exhaustive-deps

  // initialize appearance & state
  useEffect(() => {
    const pendingPurchase = getPendingPurchase(sessionId);
    if (pendingPurchase) {
      setFeatureOptions([ pendingPurchase.vars.features ]);
      setFeatureSelection(0);
      setName(pendingPurchase.vars.name);
      setFinalizing(true);
    } else if (finalizing) {
      if ((crew || []).find((c) => c.name === name)) {
        setFinalizing(false);
        setFinalized(true);
      }
      // TODO (enhancement): after timeout, show error
    } else if (featureOptions.length === 0) {
      rerollAppearance();
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    crew?.length,
    finalizing,
    getPendingPurchase,
    name,
    rerollAppearance,
    sessionId,
    featureOptions.length
  ]);

  // hide until loaded
  if (!storyState || !featureOptions || !rewards) return null;
  if (featureOptions.length === 0) return null;

  // draft crew
  const crewmate = { ...featureOptions[featureSelection] };
  if (finalized) crewmate.name = name;
  return (
    <Details
      onCloseDestination={onCloseDestination}
      contentProps={{ style: { display: 'flex', flexDirection: 'column', } }}
      edgeToEdge
      title="Crew Assignments"
      width="max">
      <ImageryContainer src={storyState.completionImage || storyState.image}>
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
                    crew={crewmate}
                    fontSize="25px"
                    hideCollectionInHeader
                    hideFooter
                    noWrapName={finalized}
                    showClassInHeader={finalized} />
                </div>
              </CardContainer>
              {!finalized && (
                <Traits>
                  {crewmate.crewClass && (
                    <TraitRow>
                      <Trait side="left" isCrewClass>
                        <div>
                          <CrewClassIcon crewClass={crewmate.crewClass} overrideColor="inherit" />
                        </div>
                        <article>
                          <h4>{toCrewClass(crewmate.crewClass)}</h4>
                          <div>{toCrewClassDescription(crewmate.crewClass)}</div>
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

                  <TraitRow>
                    <Trait side="left">
                      <div>
                        <CrewTraitIcon trait={rewards[traitDispOrder[0]].id} type={rewards[traitDispOrder[0]].type} />
                      </div>
                      <article>
                        <h4>{rewards[traitDispOrder[0]].name}</h4>
                        <div>{rewards[traitDispOrder[0]].description}</div>
                      </article>
                      <TipHolder>
                        <TriangleTip strokeWidth="1" rotate="90" />
                      </TipHolder>
                    </Trait>

                    <TraitSpacer />
                    
                    <Trait side="right">
                      <div>
                        <CrewTraitIcon trait={rewards[traitDispOrder[1]].id} type={rewards[traitDispOrder[1]].type} />
                      </div>
                      <article>
                        <h4>{rewards[traitDispOrder[1]].name}</h4>
                        <div>{rewards[traitDispOrder[1]].description}</div>
                      </article>
                      <TipHolder>
                        <TriangleTip strokeWidth="1" rotate="-90" />
                      </TipHolder>
                    </Trait>
                  </TraitRow>

                  <TraitRow>
                    <Trait side="left">
                      <div>
                        <CrewTraitIcon trait={rewards[traitDispOrder[2]].id} type={rewards[traitDispOrder[2]].type} />
                      </div>
                      <article>
                        <h4>{rewards[traitDispOrder[2]].name}</h4>
                        <div>{rewards[traitDispOrder[2]].description}</div>
                      </article>
                      <TipHolder side="left">
                        <TriangleTip strokeWidth="1" rotate="90" />
                      </TipHolder>
                    </Trait>

                    <TraitSpacer />

                    <Trait side="right">
                      <div>
                        <CrewTraitIcon trait={rewards[traitDispOrder[3]].id} type={rewards[traitDispOrder[3]].type} />
                      </div>
                      <article>
                        <h4>{rewards[traitDispOrder[3]].name}</h4>
                        <div>{rewards[traitDispOrder[3]].description}</div>
                      </article>
                      <TipHolder side="right">
                        <TriangleTip strokeWidth="1" rotate="-90" />
                      </TipHolder>
                    </Trait>
                  </TraitRow>
                </Traits>
              )}
            </CardWrapper>

            {!finalized && (
              <NameSection>
                <TextInput disabled={finalizing} onChange={handleNameChange} placeholder="Enter Name" initialValue={name} />
                <RerollContainer>
                  <IconButton
                    onClick={rollBack}
                    disabled={finalizing || featureSelection === 0}
                    style={{ opacity: featureOptions.length > 1 ? 1 : 0 }}>
                    <UndoIcon />
                  </IconButton>
                  
                  <Button
                    disabled={finalizing}
                    lessTransparent
                    onClick={rerollAppearance}>Randomize Appearance</Button>
                  
                  <IconButton
                    onClick={rollForward}
                    disabled={finalizing || featureSelection === featureOptions.length - 1}
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
        {!finalized && (
          <>
            <Button
              onClick={() => setTraitDetailsOpen(true)}
              style={{ width: 'auto' }}>
              Review Traits
            </Button>
            <Button
              disabled={finalizing || !name}
              loading={finalizing}
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
      
      {traitDetailsOpen && (
        <MobileDialogContainer>
          <Dialog>
            <Trait isCrewClass>
              <div>
                <CrewClassIcon crewClass={crewmate.crewClass} overrideColor="inherit" />
              </div>
              <article>
                <h4>{toCrewClass(crewmate.crewClass)}</h4>
                <div>{toCrewClassDescription(crewmate.crewClass)}</div>
              </article>
            </Trait>
            
            <Trait isCrewClass>
              <div>
                <AdalianIcon />
              </div>
              <article>
                <h4>Adalian Citizen</h4>
                <div>Completed secondary education and entered adulthood in the Adalian System, after the dismantling of the Arvad.</div>
              </article>
            </Trait>
              
            <Trait>
              <div>
                <CrewTraitIcon trait={rewards[traitDispOrder[0]].id} type={rewards[traitDispOrder[0]].type} />
              </div>
              <article>
                <h4>{rewards[traitDispOrder[0]].name}</h4>
                <div>{rewards[traitDispOrder[0]].description}</div>
              </article>
            </Trait>
            
            <Trait>
              <div>
                <CrewTraitIcon trait={rewards[traitDispOrder[1]].id} type={rewards[traitDispOrder[1]].type} />
              </div>
              <article>
                <h4>{rewards[traitDispOrder[1]].name}</h4>
                <div>{rewards[traitDispOrder[1]].description}</div>
              </article>
            </Trait>
            
            <Trait>
              <div>
                <CrewTraitIcon trait={rewards[traitDispOrder[2]].id} type={rewards[traitDispOrder[2]].type} />
              </div>
              <article>
                <h4>{rewards[traitDispOrder[2]].name}</h4>
                <div>{rewards[traitDispOrder[2]].description}</div>
              </article>
            </Trait>

            <Trait>
              <div>
                <CrewTraitIcon trait={rewards[traitDispOrder[3]].id} type={rewards[traitDispOrder[3]].type} />
              </div>
              <article>
                <h4>{rewards[traitDispOrder[3]].name}</h4>
                <div>{rewards[traitDispOrder[3]].description}</div>
              </article>
            </Trait>

            <Button onClick={() => setTraitDetailsOpen(false)}>Close</Button>
          </Dialog>
        </MobileDialogContainer>
      )}
      {confirming && (
        <ConfirmationDialog
          title="Confirm Character Minting"
          body={(
            <PromptBody>
              The Crewmate you are about to create will be minted as a new unique
              Non-fungible Token (NFT)! Once minted, the character can never be deleted
              or unmade, and is yours to keep or trade forever. All of their stats,
              actions, skills, and attributes will be appended to their unique history
              and stored as independent on-chain events.
            </PromptBody>
          )}
          onConfirm={finalize}
          confirmText={<>
            Confirm
            {crewSale && (
              <span style={{ flex: 1, fontSize: '90%', textAlign: 'right' }}>
                <Ether>{formatters.crewPrice(crewSale)}</Ether>
              </span>
            )}
          </>}
          onReject={() => setConfirming(false)}
        />
      )}
    </Details>
  );
};

export default CrewAssignmentCreate;
