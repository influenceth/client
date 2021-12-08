import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';

import useBook from '~/hooks/useBook';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useMintableCrew from '~/hooks/useMintableCrew';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useStore from '~/hooks/useStore';
import Details from '~/components/Details';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import TitleWithUnderline from '~/components/TitleWithUnderline';
import {
  ArvadIcon,
  BackIcon,
  CheckIcon,
  ChevronDoubleDownIcon as SelectIcon,
  CollapsedIcon,
  ExpandedIcon,
  LockIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import SvgFromSrc from '~/components/SvgFromSrc';
import CrewCard from './crewAssignments/CrewCard';

import theme from '~/theme.js';

const crewStates = {
  ready: {
    alwaysOn: ['button'],
    button: 'Ready to Start',
    buttonAttention: true,
    buttonHover: 'Begin Assignment',
    buttonIconHover: null,
    clickable: true,
    icon: <SelectIcon />,
    rgb: theme.colors.mainRGB,
    rgbHover: '255, 255, 255',
  },
  notReady: {
    alwaysOn: ['button', 'caption', 'icon'],
    button: 'Not Ready',
    caption: 'This character must finish a previous chapter first.',
    fade: true,
    icon: <WarningOutlineIcon />,
    rgb: '200, 129, 55'
  },
  complete: {
    alwaysOn: ['button', 'icon'],
    button: 'Finished',
    fade: true,
    icon: <CheckIcon />,
    rgb: theme.colors.successRGB,
  },
  incomplete: {
    alwaysOn: ['button'],
    button: 'Continue »',
    buttonAttention: true,
    clickable: true,
    icon: <SelectIcon />,
    rgb: '255, 255, 255',
  }
};

const HEADER_HEIGHT = 40;

const SectionContainer = styled.div`
  flex: 1;
  position: relative;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 0 10px;
    ${p => !p.visible ? 'display: none;' : ''}
  }
`;

const SectionHeader = styled.div`
  height: ${HEADER_HEIGHT}px;
`;

const SectionBody = styled.div`
  height: calc(100% - ${HEADER_HEIGHT}px - 1.5em);
  margin-top: 1.5em;
  overflow: auto;
  scrollbar-width: thin;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    margin-top: 10px;
  }
`;

const SectionSpacer = styled.div`
  width: 40px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const CrewHeader = styled(SectionHeader)`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const MobileCrewHeaderContainer = styled.div`
  display: none;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: flex;
    flex-direction: row;
    & ${CrewHeader} {
      display: flex;
      flex: 1;
    }
    & > div:first-child {
      align-items: center;
      display: flex;
      font-size: 24px;
      height: ${HEADER_HEIGHT}px;
      justify-content: center;
      width: ${HEADER_HEIGHT}px;
    }
  }
`;

const CrewSection = styled(SectionBody)`
  padding-left: 3px;
  padding-top: 3px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  @media (min-width: ${p => p.theme.breakpoints.xl}px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
  & > div {
    padding: 0 12px 12px 0;
  }
`;

const CrewlessSection = styled(SectionBody)`
  padding: 15px;
  background: rgba(51, 51, 51, 0.5);
  text-align: center;
  & > div {
    & > a {
      white-space: nowrap;
    }
  } 
`;

const SectionTitle = styled.div`
  font-size: 16px;  
  font-weight: bold;
`;

const SectionSubtitle = styled.div`
  font-size: 13px;  
  line-height: 1.6em;
  opacity: 0.6;
`;

const BookHeader = styled(SectionHeader)`
  align-items: flex-end;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: ${p => p.theme.colors.main};
  display: flex;
  font-size: 16px;
  text-transform: uppercase;

  & > * {
    height: 32px;
  }
`;
const BookIcon = styled.div`
  font-size: 2em;  
  margin-right: 12px;
  margin-bottom: 12px;
`;

const BookBody = styled(SectionBody)`
  padding-right: 10px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-right: 0px;
  }
`;

const PartTitle = styled.div`
  cursor: ${p => p.theme.cursors.active};
  div:nth-child(1) {
    color: ${p => p.theme.colors.main};
    flex: 1;
    font-size: 13px;
  }
  div:nth-child(2) {
    font-size: 20px;
  }
`;
const PartSection = styled.div`
  margin-top: 1.5em;
  &:first-child { margin-top: 0; }
  & > ${PartTitle} {
    display: flex;
    justifyContent: space-between;
    height: 24px;
    width: 100%; 
  }
`;

const ChaptersContainer = styled.div`
  max-height: ${p => p.collapsed ? '1px' : '400px'};
  overflow: hidden;
  transition: max-height 250ms ease-out;
`;

const ChapterRowInner = styled.div`
  border-bottom: 1px solid rgba(255,255,255,0.2);
  flex: 1;
  height: 100%;
  margin-left: 0.75em;
  padding: 6px 0;

  & > div {
    align-items: center;
    background-color: ${p => p.selected ? 'rgba(255, 255, 255, 0.2)' : 'none'};
    display: flex;
    font-size: 13px;
    height: 100%;
    padding: 0 6px 0 12px;
    transition: background-color 200ms ease;

    & > div {
      flex: 1;
      font-size: 17px;
    }
  }
`;

const ChapterRow = styled.div`
  align-items: center;
  color: ${p => p.status === 'locked' ? '#666' : 'white'};
  cursor: ${p => p.status === 'locked' ? null : p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  height: 48px;

  &:first-child ${ChapterRowInner} {
    border-top: 1px solid rgba(255,255,255,0.2);
  }

  &:hover ${ChapterRowInner} > div {
    background-color: ${p => p.status === 'locked' ? null : 'rgba(255, 255, 255, 0.25)'};
  }
`;

const diamondConnectionHeight = 20;
const DiamondContainer = styled.div`
  align-items: center;
  display: flex;
  font-size: 80%;
  height: 100%;
  justify-content: center;
  margin: 0 0.1em 0 0.5em;
  position: relative;
  width: 1em;
  z-index: 2;
  ${(p) => p.connect && `
    &:before {
      content: '';
      position: absolute;
      height: ${diamondConnectionHeight}px;
      width: 0;
      border-left: 1px dotted #AAA;
      bottom: calc(100% - ${diamondConnectionHeight / 2}px);
      left: calc(50% - 1px);
      z-index: 1;
    }`}
`;

const ChapterProgressContainer = styled.span`
  align-items: center;
  color: ${p => p.status === 'complete' ? p.theme.colors.success : p.theme.colors.main};
  display: flex;
  flex-direction: row;
  &:before {
    content: "${p => p.crewReady > 0 ? p.crewReady : ''}";
    margin-right: 6px;
  }
`;

const ProgressIcon = styled.span`
  border-radius: 50%;
  display: block;
  height: ${p => p.size};
  width: ${p => p.size};
  ${p => {
    if (p.status === 'notReady') {
      return `border: 0.2em solid currentColor;`;
    } else if (p.status === 'full') {
      return `background: currentColor;`;
    } else if (p.status === 'partial') {
      return `background: linear-gradient(to right, ${p.inactiveColor} 50%, currentColor 50%);`;
    }
    return '';
  }}
`;

const CrewAssignments = (props) => {
  const { id: bookId, selected: initialSelectedId } = useParams();
  const history = useHistory();
  const { account } = useWeb3React();

  const createStorySession = useCreateStorySession();
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();
  const { data: book, isError } = useBook(bookId);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [collapsedParts, setCollapsedParts] = useState([]);
  const [bookReady, setBookReady] = useState(false);
  const [mobileView, setMobileView] = useState('book');
  const [selectedStory, setSelectedStory] = useState();

  const selectStory = useCallback((story) => () => {
    if (story) {
      playSound('effects.click');
      setSelectedStory(story);
      setMobileView('crew');
    } else {
      playSound('effects.failure');
    }
  }, [playSound]);

  const selectCrew = useCallback((crewId) => async () => {
    if (bookReady && selectedStory) {
      const crewStatus = selectedStory.crewStatuses[crewId];
      if (crewStatus && !['notReady', 'loading'].includes(crewStatus)) {
        let session = (selectedStory.sessions || []).find((s) => s.owner === crewId);

        // if no session yet, create one
        if (!session) {
          session = await new Promise((resolve, reject) => {
            createStorySession.mutate({
              bookId,
              storyId: selectedStory.id,
              crewId
            }, {
              onSuccess: resolve,
              onError: reject
            })
          });
        }

        if (session) {
          playSound('effects.success');
          history.push(`/crew-assignment/${session.id}`);
          return;
        }
      }
      return;
    }
    
    playSound('effects.failure');
  }, [bookId, bookReady, createStorySession, history, playSound, selectedStory]);

  useEffect(() => {
    if (book && crew) {
      let firstIncompleteStory = null;
      let initialSelectedStory = null;
      let lastStory = null;
      let crewReadyForNext = crew.map(({ i }) => i);
      book.parts.forEach(({ stories }) => {
        stories.forEach((item, i) => {
          if (!item.story) item.story = { id: `placeholder_${i}` };

          const { story } = item;
          const comingSoon = !story.title
            || story.title === 'COMING_SOON'
            || (story.availableOn && new Date(story.availableOn) > new Date());
          if (comingSoon) {
            story.status = 'locked';
          } else {
            story.crewStatuses = {};
            story.ready = 0;
            story.partial = 0;
            story.complete = 0;

            const crewCompleted = [];
            crew.forEach(({ i }) => {
              if (crewReadyForNext.includes(i)) {
                const crewSession = (story.sessions || []).find((s) => s.owner === i);
                if (crewSession && crewSession.isComplete) {
                  story.complete++;
                  story.crewStatuses[i] = 'complete';
                  crewCompleted.push(i);
                } else if (crewSession && !crewSession.isComplete) {
                  story.partial++;
                  story.crewStatuses[i] = 'incomplete';
                } else {
                  story.ready++;
                  story.crewStatuses[i] = 'ready';
                }
              } else {
                story.crewStatuses[i] = 'notReady';
              }
            });
            crewReadyForNext = crewCompleted;

            // set story status
            story.status = 'notReady';
            if (crew?.length > 0) {
              if (story.complete === crew.length) {
                story.status = 'complete';
              } else if (story.ready + story.partial === crew.length) {
                story.status = 'full';
              } else if (story.ready + story.partial + story.complete === crew.length) {
                story.status = 'partial';
              }
            }

            // set story of desired selection from url (if any)
            if (initialSelectedId && initialSelectedId === story.id) {
              initialSelectedStory = story;
            }
            // find first incomplete story (and keep track of last story as fallback)
            if (firstIncompleteStory === null && story.status !== 'complete') {
              firstIncompleteStory = story;
            }
            lastStory = story;
          }
        });
      });
      setSelectedStory(initialSelectedStory || firstIncompleteStory || lastStory);
      setBookReady(true);
    }
  }, [book, crew, initialSelectedId]);

  const togglePart = useCallback((partId) => () => {
    playSound('effects.click');
    if (collapsedParts.includes(partId)) {
      setCollapsedParts(
        collapsedParts.filter((p) => p !== partId)
      );
    } else {
      setCollapsedParts([
        ...collapsedParts,
        partId
      ]);
    }
  }, [collapsedParts, playSound]);

  if (!book && isError) {
    createAlert({
      type: 'GenericLoadingError',
      label: 'crew assignment collection',
      level: 'warning',
    });
    history.push('/');
  }

  const { title, parts } = book || {};
  return (
    <Details title="Crew Assignments">
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%'
      }}>
        <SectionContainer visible={mobileView === 'book'}>
          {!bookReady && <Loader />}
          {bookReady && (
            <>
              <BookHeader>
                <BookIcon>
                  {book.icon && <SvgFromSrc src={book.icon} />}
                  {!book.icon && <ArvadIcon />}
                </BookIcon>
                <TitleWithUnderline>{title}</TitleWithUnderline>
              </BookHeader>
              <BookBody>
                {parts.map(({ title, stories }, x) => {
                  const isCollapsed = collapsedParts.includes(title);
                  return (
                    <PartSection key={x}>
                      <PartTitle onClick={togglePart(title)}>
                        <div>{title}</div>
                        <div>{isCollapsed ? <CollapsedIcon /> : <ExpandedIcon />}</div>
                      </PartTitle>
                      <ChaptersContainer collapsed={isCollapsed}>
                        {stories.map(({ story }, i) => {
                          const { id, title, ready, partial, status } = (story || { id: i, status: 'locked' });
                          return (
                            <ChapterRow
                              key={id}
                              onClick={selectStory(status === 'locked' ? null : story)}
                              status={status}>
                              <DiamondContainer connect={i > 0}>
                                <NavIcon
                                  animate
                                  selected={selectedStory && id === selectedStory.id} />
                              </DiamondContainer>
                              <ChapterRowInner index={x} selected={selectedStory && id === selectedStory.id}>
                                <div>
                                  <div>{status === 'locked' ? 'Coming Soon' : title}</div>
                                  {status === 'locked' && <LockIcon style={{ opacity: 0.7 }} />}
                                  {status !== 'locked' && (
                                    <ChapterProgressContainer crewReady={ready + partial} status={status}>
                                      {status === 'complete' && <CheckIcon />}
                                      {status !== 'complete' && (
                                        <ProgressIcon size="1em"
                                          inactiveColor="#003f54"
                                          status={status}
                                        />
                                      )}
                                    </ChapterProgressContainer>
                                  )}
                                </div>
                              </ChapterRowInner>
                            </ChapterRow>
                          )
                        })}
                      </ChaptersContainer>
                    </PartSection>
                  );
                })}
              </BookBody>
            </>
          )}
        </SectionContainer>

        <SectionSpacer />
        
        <SectionContainer visible={mobileView === 'crew'}>
          {account && !crew && <Loader />}
          {!(account && !crew) && (
            <>
              <CrewHeader>
                <SectionTitle>Owned Crew ({crew?.length || 0})</SectionTitle>
                <SectionSubtitle>Select a Crew Member to begin the assignment with:</SectionSubtitle>
              </CrewHeader>

              <MobileCrewHeaderContainer>
                <div onClick={() => setMobileView('book')}>
                  <BackIcon />
                </div>
                <CrewHeader>
                  <SectionTitle>{selectedStory?.title || ''}</SectionTitle>
                  <SectionSubtitle>Select a Crew Member to begin the assignment with:</SectionSubtitle>
                </CrewHeader>
              </MobileCrewHeaderContainer>

              {crew && crew.length > 0
                ? (
                  <CrewSection>
                    {crew.map((c) => {
                      const crewStatus = bookReady ? selectedStory?.crewStatuses[c.i] : 'loading';
                      return (
                        <div key={c.i}>
                          <CrewCard
                            crew={c}
                            config={crewStates[crewStatus || 'notReady']}
                            onClick={selectCrew(c.i)} />
                        </div>
                      );
                    })}
                  </CrewSection>
                )
                : (
                  <CrewlessSection>
                    <h4>You must have a crew to complete crew assignments.</h4>
                    <div>
                      <a href={`${process.env.REACT_APP_OPEN_SEA_URL}/collection/influence-crew`} target="_blank" rel="noreferrer">Click here</a>
                      {' '}to acquire crew members through trade
                      {true || mintable?.length
                        ? (
                          <span>
                            {', '}or <Link to="/owned-crew">click here</Link> to mint your own.
                          </span>
                        ) : '.'}
                    </div>
                  </CrewlessSection>
                )
              }
            </>
          )}
        </SectionContainer>
      </div>
    </Details>
  );
};

export default CrewAssignments;
