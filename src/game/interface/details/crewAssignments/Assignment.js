import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled from 'styled-components';

import orbitalPeriodImage from '~/assets/images/orbital-period.png';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStorySession from '~/hooks/useStorySession';
import useStore from '~/hooks/useStore';
import Button from '~/components/Button';
import Details from '~/components/Details';
import Dialog from '~/components/Dialog';
import { BackIcon } from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import CrewCard from './CrewCard';

import theme from '~/theme.js';

const InvisibleImage = styled.img`
  display: none;
`;

const CoverImage = styled.div`
  height: calc(100% - 310px);
  &:before {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    content: '';
    display: block;
    opacity: ${p => p.ready ? 1 : 0};
    height: 100%;
    mask-image: linear-gradient(to bottom, black 75%, transparent 100%);
    transition: opacity 700ms ease-out;
  }
`;

const AboveFold = styled.div`
  height: 88px;
  margin-top: -88px;
  padding: 0 35px;
  position: relative;
  z-index: 1;
`;

const belowFoldHeight = 310;
const BelowFold = styled.div`
  display: flex;
  flex-direction: row;
  height: ${belowFoldHeight}px;
  padding: 10px 0 10px 35px;
`;

// width is based on aspect ratio of crew cards
const CrewContainer = styled.div`
  padding: 0 12px 12px 0;
  width: ${belowFoldHeight / 1.375}px;
`;

const BackButton = styled.div`
  align-items: center;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 1em;
  text-transform: uppercase;
  & *:first-child {
    margin-right: 0.75em;
  }
`;

const Title = styled.div`
  font-size: 36px;
  font-weight: bold;
`;

const Body = styled.div`
  flex: 1;
  font-size: 90%;
  height: 100%;
  line-height: 1.25em;
  overflow: auto;
  padding: 0 25px 0;
  position: relative;
  scrollbar-width: thin;
`;

const Flourish = styled.div`
  text-align: center;
  overflow: hidden;
  width: 250px;
  &:after {
    background: url(${orbitalPeriodImage}) no-repeat center center;
    background-size: contain;
    content: '';
    display: block;
    margin: 0 auto;
    opacity: 0.35;
    width: 175px;
    height: 175px;
  }
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
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [selection, setSelection] = useState();

  // on step change, clear selection (to close modal)
  useEffect(() => {
    setSelection();
  }, [currentStep]);

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
    history.push(`/crew-assignments/${storyState.book}`);
  }, [history, playSound, storyState]);

  const finish = useCallback(() => {
    playSound('effects.success');
    history.push(`/crew-assignment/${sessionId}/complete`);
  }, [history, playSound, sessionId]);

  const crew = useMemo(() => {
    return allCrew && storyState && allCrew.find(({ i }) => i === storyState.owner);
  }, [storyState, allCrew]);

  const [coverImageLoaded, setCoverImageLoaded] = useState();
  const onCoverImageLoad = () => {
    setCoverImageLoaded(storyState.image);
  };
  useEffect(() => {
    if (storyState && storyState.image !== coverImageLoaded) {
      setCoverImageLoaded();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyState?.image]);

  const contentReady = storyState && crew;
  return (
    <>
      <Details title="Assignments" edgeToEdge>
        {!contentReady && <Loader />}
        {contentReady && (
          <>
            <InvisibleImage src={storyState.image} onLoad={onCoverImageLoad} />
            <CoverImage src={storyState.image} ready={!!coverImageLoaded} />
            <AboveFold>
              <BackButton onClick={goBack}><BackIcon /> Back</BackButton>
              <Title>{storyState.title}</Title>
            </AboveFold>
            <BelowFold>
              <CrewContainer>
                <CrewCard crew={crew} />
              </CrewContainer>
              <Body>
                {loadingPath && <Loader />}
                {!loadingPath && (
                  <>
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
                  </>
                )}
              </Body>
              <Flourish>
                <h4 style={{ marginBottom: 6 }}>{Math.min(totalSteps, currentStep + 1)} of {totalSteps}</h4>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  {Array.from({ length: totalSteps }, (x, i) => {
                    let color = '#777';
                    if (i < currentStep) {
                      color = theme.colors.main;
                    } else if (i === currentStep) {
                      color = '#FFF';
                    }
                    return (
                      <React.Fragment key={i}>
                        {i > 0 && (
                          <div style={{
                            height: 0,
                            borderTop: `1px dotted ${i <= currentStep ? '#FFF' : '#777'}`,
                            width: '1.5em'
                          }} />
                        )}
                        <NavIcon selected={i === currentStep} size={'1.5em'} color={color} />
                      </React.Fragment>
                    );
                  })}
                </div>
              </Flourish>
            </BelowFold>
          </>
        )}
      </Details>
      {selection && (
        <Dialog>
          <Confirmation>
            <ConfirmationTitle>
              <NavIcon
                selected
                selectedColor={'white'} 
                size={28}
                style={{ marginRight: 8 }} />
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
