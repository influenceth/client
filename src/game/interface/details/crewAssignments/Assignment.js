import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { toCrewClass } from 'influence-utils';

import useBook from '~/hooks/useBook';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStorySession from '~/hooks/useStorySession';
import useStore from '~/hooks/useStore';
import Button from '~/components/Button';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import Details from '~/components/Details';
import Dialog from '~/components/Dialog';
import { ArvadIcon, BackIcon } from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import SvgFromSrc from '~/components/SvgFromSrc';

import theme from '~/theme.js';

const foldOffset = 28;
const belowFoldMin = 256;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const InvisibleImage = styled.img`
  display: none;
`;

const CoverImage = styled.div`
  height: calc(50% + ${foldOffset}px);
  max-height: calc(100% - ${foldOffset}px - ${belowFoldMin}px);

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 33%;
    max-height: none;
  }

  &:before {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: ${p => p.center || 'center center'};
    background-size: cover;
    content: '';
    display: block;
    opacity: ${p => p.ready ? 1 : 0};
    height: 100%;
    mask-image: linear-gradient(to bottom, black 75%, transparent 100%);
    transition: opacity 750ms ease-out, background-image 750ms ease-out;
  }
`;

const aboveFoldHeight = 88;
const aboveFoldMobileMargin = -30;
const AboveFold = styled.div`
  height: ${aboveFoldHeight}px;
  margin-top: -${aboveFoldHeight}px;
  opacity: 0;
  padding: 0 35px;
  position: relative;
  z-index: 1;

  opacity: ${p => p.ready ? 1 : 0};
  transition: opacity 750ms ease-out;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-top: ${aboveFoldMobileMargin}px;
    padding: 0 25px;
  }
`;

const BelowFold = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(50% - ${foldOffset}px);
  padding: 10px 0 10px 35px;
  position: relative;
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) {
    min-height: ${belowFoldMin}px;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: calc(67% - ${aboveFoldHeight + aboveFoldMobileMargin}px);
    padding: 10px 0 0;
  }

  & > * {
    opacity: 0;
    &:nth-child(1) {
      animation: ${opacityTransition} 600ms normal forwards ease 200ms;
    }
    &:nth-child(2) {
      animation: ${opacityTransition} 600ms normal forwards ease 400ms;
    }
    &:nth-child(3) {
      animation: ${opacityTransition} 600ms normal forwards ease 600ms;
    }
  }
`;

const CrewContainer = styled.div`
  flex: 0 1 275px;
  min-width: 210px;
  padding: 0 12px 12px 0;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const MobileCrewContainer = styled.div`
  display: none;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    align-items: center;
    display: flex;
    & > div:first-child {
      flex: 1;
    }
    & > div:last-child {
      font-size: 13px;
    }
  }
`;

const BackButton = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: inline-flex;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 1em;
  text-transform: uppercase;
  & *:first-child {
    margin-right: 0.75em;
  }
  &:hover {
    color: white;
  }
`;

const Title = styled.div`
  font-size: 36px;
  font-weight: bold;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    font-size: 28px;
  }
`;

const Body = styled.div`
  flex: 0 1 775px;
  font-size: 90%;
  height: 100%;
  line-height: 1.25em;
  overflow: auto;
  padding: 0 25px 25px 25px;
  position: relative;
  scrollbar-width: thin;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-top: 5px;
  }
`;

const Flourish = styled.div`
  display: flex;
  flex: 1 0 250px;
  flex-direction: column;
  overflow: hidden;
  text-align: center;

  @media (max-width: 1300px) {
    display: none;
  }

  & > h4 {
    margin-bottom: 16px;
  }
`;

const NavSpacer = styled.div`
  border-top: 1px dotted ${p => p.completed ? '#FFF' : '#777'};
  height: 0;
  margin: 0 8px;
  width: 1.5em;
`;

const FlourishCentered = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const FlourishImageContainer = styled(FlourishCentered)`
  color: white;
  font-size: ${p => p.shrinkIcon ? '80px' : '120px'};
  margin-top: 16px;
  opacity: 0.1;
`;

const Path = styled.div`
  cursor: ${p => p.theme.cursors.active};
  background-color: rgba(255, 255, 255, 0);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 0;
  transition: background-color 200ms ease;

  &:first-child {
    border-top: 1px solid rgba(255, 255, 255,0.2);
  }

  & > div {
    align-items: flex-start;
    display: flex;
    padding: 6px 16px 6px 0;

    & > span:first-child {
      color: white;
      font-weight: bold;
      text-align: center;
      width: 3em;
    }
    & > span:last-child {
      color: ${p => p.theme.colors.main};
      flex: 1;
      transition: color 200ms ease;
    }
  }

  ${p => p.selected ? '&' : '&:hover'} > div {
    background-color: rgba(255, 255, 255, 0.2);
    & > span:last-child {
      color: white;
    }
  }
`;

const PageContent = styled.div`
  color: #aaa;
  white-space: pre-line;
  margin-bottom: 1.5em;
`;
const PagePrompt = styled.div`
  color: white;  
  margin-bottom: 1em;
`;

const Confirmation = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 300px;
  width: 650px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    width: 90vw;
  }
`;
const ConfirmationTitle = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 60px;
  padding: 8px 16px;
  & > h4 { flex: 1, margin: 0 }
`;
const ConfirmationBody = styled.div`
  flex: 1;
  font-size: 15px;
  padding: 40px 80px;
  & > article {
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    color: ${p => p.theme.colors.main};
    padding: 1em 2em;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 40px 20px;
  }
`;
const ConfirmationButtons = styled.div`
  display: flex;
  flex-direction: row;
  height: 60px;
  justify-content: center;
  align-items: center;
  padding: 8px 8px 16px;
  & > button {
    margin-top: 0;
    margin-left: 1em;
    &:first-child {
      margin-left: 0;
    }
  }
`;

const totalSteps = 3;

const CrewAssignment = (props) => {
  const { id: sessionId } = useParams();
  const history = useHistory();
  const { data: allCrew } = useOwnedCrew();
  const { currentStep, storyState, commitPath, loadingPath } = useStorySession(sessionId);
  const { data: book } = useBook(storyState?.book)
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [coverImageLoaded, setCoverImageLoaded] = useState();
  const [selection, setSelection] = useState();

  // on step change, clear selection (to close modal)
  useEffect(() => {
    setSelection();
  }, [currentStep]);

  const onCoverImageLoad = useCallback(() => {
    setCoverImageLoaded(storyState?.image);
  }, [storyState?.image]);

  const selectPath = useCallback((path) => () => {
    playSound('effects.click');

    // if only one choice, don't need to confirm
    if (storyState.linkedPaths?.length === 1) {
      commitPath(path.path);
    // else, confirm in modal
    } else {
      setSelection(path);
    }
  }, [commitPath, playSound, storyState]);

  const confirmPath = useCallback(() => {
    playSound('effects.click');
    commitPath(selection.path);
  }, [commitPath, playSound, selection]);

  const goBack = useCallback(() => {
    playSound('effects.click');
    history.push(`/crew-assignments/${storyState?.book}/${storyState?.story}`);
  }, [history, playSound, storyState]);

  const finish = useCallback(() => {
    playSound('effects.success');
    history.push(`/crew-assignment/${sessionId}/complete`);
  }, [history, playSound, sessionId]);

  const crew = useMemo(() => {
    return allCrew && storyState && allCrew.find(({ i }) => i === storyState.owner);
  }, [storyState, allCrew]);

  const contentReady = storyState && crew;
  const pathIsReady = contentReady && storyState.image === coverImageLoaded && !loadingPath;
  return (
    <>
      <Details title="Crew Assignments" edgeToEdge>
        {!contentReady && <Loader />}
        {contentReady && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <InvisibleImage src={storyState.image} onLoad={onCoverImageLoad} />
            <CoverImage
              src={storyState.image}
              center={storyState.imageCenter}
              ready={storyState.image === coverImageLoaded} />
            <AboveFold ready={storyState.image === coverImageLoaded}>
              <BackButton onClick={goBack}><BackIcon /> Back</BackButton>
              <Title>{storyState.title}</Title>
              <MobileCrewContainer>
                <div>
                  <b>{crew.name || `Crew Member #${crew.i}`}</b>
                  {' '}<CrewClassIcon crewClass={crew.crewClass} />
                </div>
                <div>{toCrewClass(crew.crewClass) || 'Unknown Class'}</div>
              </MobileCrewContainer>
            </AboveFold>
            <BelowFold>
              {!pathIsReady && <Loader />}
              {pathIsReady && (
                <>
                  <CrewContainer>
                    <CrewCard crew={crew} />
                  </CrewContainer>
                  <Body>
                    <PageContent>{storyState.content}</PageContent>
                    {(storyState.linkedPaths || []).length > 0
                      ? (
                        <>
                          <PagePrompt>{storyState.prompt}</PagePrompt>
                          <div>
                            {storyState.linkedPaths.map((linkedPath, i) => (
                              <Path key={linkedPath.path}
                                selected={linkedPath.path === selection?.id}
                                onClick={selectPath(linkedPath)}>
                                <div>
                                  <span>{String.fromCharCode(65 + i)}</span>
                                  <span>{linkedPath.text}</span>
                                </div>
                              </Path>
                            ))}
                          </div>
                        </>
                      )
                      : (
                        <Button
                          onClick={finish}
                          style={{ margin: '0 auto' }}>Finish</Button>
                      )
                    }
                  </Body>
                  <Flourish>
                    <h4>{Math.min(totalSteps, currentStep + 1)} of {totalSteps}</h4>
                    <FlourishCentered>
                      {Array.from({ length: totalSteps }, (x, i) => {
                        let color = '#777';
                        if (i < currentStep) {
                          color = theme.colors.main;
                        } else if (i === currentStep) {
                          color = '#FFF';
                        }
                        return (
                          <React.Fragment key={i}>
                            {i > 0 && <NavSpacer completed={i <= currentStep} />}
                            <NavIcon
                              animate
                              selected={i === currentStep}
                              size="1em"
                              color={color} />
                          </React.Fragment>
                        );
                      })}
                    </FlourishCentered>
                    <FlourishImageContainer shrinkIcon={book && !book.icon}>
                      {book && book.icon && <SvgFromSrc src={book.icon} />}
                      {book && !book.icon && <ArvadIcon />}
                    </FlourishImageContainer>
                  </Flourish>
                </>
              )}
            </BelowFold>
          </div>
        )}
      </Details>
      {selection && (
        <Dialog>
          <Confirmation>
            <ConfirmationTitle>
              <NavIcon
                selected
                selectedColor="white"
                size={22}
                style={{ marginRight: 12 }} />
              <h4>Your Selection:</h4>
            </ConfirmationTitle>
            <ConfirmationBody>
              {loadingPath && <Loader />}
              {!loadingPath && (
                <>
                  <PagePrompt>{storyState.prompt}</PagePrompt>
                  <article>{selection.text}</article>
                </>
              )}
            </ConfirmationBody>
            <ConfirmationButtons>
              <Button onClick={selectPath()} disabled={loadingPath}>Back</Button>
              <Button onClick={confirmPath} disabled={loadingPath}>Confirm</Button>
            </ConfirmationButtons>
          </Confirmation>
        </Dialog>
      )}
    </>
  );
};

export default CrewAssignment;
