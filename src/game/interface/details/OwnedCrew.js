import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';

import { MdAdd as PlusIcon } from 'react-icons/md';

import Button from '~/components/Button';
import CrewCard from '~/components/CrewCard';
import CrewInfoPane from '~/components/CrewInfoPane';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import Cutscene from '~/components/Cutscene';
import Details from '~/components/Details';
import IconButton from '~/components/IconButton';
import {
  CaptainIcon,
  CrewIcon,
  ChevronDoubleDownIcon as DeactivateIcon,
  ChevronDoubleUpIcon as ActivateIcon,
  PromoteIcon,
  ChevronDoubleDownIcon
} from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import useAuth from '~/hooks/useAuth';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrewManager from '~/hooks/useCrewManager';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useScreenSize from '~/hooks/useScreenSize';
import useStore from '~/hooks/useStore';
import theme from '~/theme.js';
import { useHistory } from 'react-router-dom';
import TriangleTip from '~/components/TriangleTip';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 30px;

  @media (min-width: 1000px) and (max-width: 1600px) {
    padding: 0;
  }
`;

const IconHR = styled.div`
  align-items: center;
  color: white;
  display: flex;
  flex-direction: row;
  font-size: 85%;
  width: 100%;

  &:before,
  &:after {
    content: '';
    border-bottom: 1px solid #2b2b2b;
    flex: 1;
  }
  & > svg {
    margin: 0 20px;
    transition: transform 200ms ease;
    transform: rotate(${p => p.collapsed ? '0' : '-180deg'});
  }
`;

const Title = styled.div`
  & > h3 {
    align-items: center;
    ${p => !p.hideBorder && `border-bottom: 1px solid #2b2b2b;`}
    display: flex;
    flex-direction: row;
    font-weight: normal;
    margin: 0;
    padding-bottom: 15px;
    & > svg {
      color: ${p => p.theme.colors.main};
      display: block;
      font-size: 150%;
      margin-right: 6px;
    }
  }
  & ${IconHR} {
    margin-top: -7px;
  }
`;

const ActiveCrew = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0;
  justify-content: center;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 5px;

  & > div {
    align-items: center;
    display: grid;
    grid-gap: 12px;
    grid-template-columns: ${p => p.captainFirst
      ? `minmax(200px, 26fr) repeat(4, minmax(175px, 18.5fr))`
      : `repeat(2, minmax(175px, 18.5fr)) minmax(200px, 26fr) repeat(2, minmax(175px, 18.5fr))`
    };
    width: 100%;

    @media (min-width: 1600px) {
      width: 92%;
    }
  }

  @media (max-width: 560px) {
    flex: 1 0;
    margin-bottom: 0;

    & > div {
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      overflow-y: visible;
      max-height: 100%;
      width: 100%;
    }
  }

  @media (min-width: 1470px) {
    margin-bottom: -40px;
  }
`;

const CrewContainer = styled.div`
  padding: ${p => p.slot === 0 ? '28px 20px 32px' : '32px 12px'};
  position: relative;
  & > svg {
    color: currentColor;
    font-size: 30px;
    left: 50%;
    margin-left: -46px;
    position: absolute;
    bottom: -16px;
  }
`;

const ButtonHolder = styled.div`
  bottom: 18px;
  left: 50%;
  margin-left: ${p => p.isCaptain ? '-15px' : '-32px'};
  position: absolute;

  & > button {
    margin-right: 4px;
    &:last-child {
      margin-right: 0;
    }
  }
`;

const CardContainer = styled.div`
  background: #111;
  border: 1px solid ${p => p.isEmpty ? '#172f37' : '#333'};
  color: #ccc;
  font-size: ${p => p.theme.fontSizes.detailText};
  padding: 4px;
`;

const ButtonRow = styled.div`
  display: inline-flex;
  justify-content: flex-end;
  padding: 15px 0;
  & > button {
    position: relative;
    z-index: 1;
  }
`;

const RevertButton = styled(Button)`
  margin-right: 10px;
  opacity: 0.5;
  width: auto;
`;

const EmptyInactiveCrew = styled.div`
  border-top: 1px solid #2b2b2b;
  height: 50px;
`;

const InactiveCrewSection = styled.div`
  position: relative;
  @media (min-width: 1024px) {
    top: -45px;
    margin-bottom: -45px;
  }
`;

const InactiveCrew = styled.div`
  overflow-y: hidden;
  overflow-x: auto;
  max-height: ${p => p.collapsed ? 0 : '300px'};
  opacity: ${p => p.collapsed ? 0 : 1};
  padding: 12px 5px 4px;
  transition: max-height 300ms ease 150ms, opacity 300ms ease;
  white-space: nowrap;
  width: 100%;

  & > div {
    display: inline-block;
    margin-right: 8px;
    width: 105px;
    &:last-child {
      margin-right: 0;
    }
  }
`;

const InnerButtonHolder = styled.div`
  bottom: 6px;
  left: 50%;
  margin-left: -15px;
  opacity: 0;
  position: absolute;
  transition: opacity 100ms ease;

  & > button {
    margin-right: 0;
  }
`;

const InactiveCardContainer = styled.div`
  border: 1px solid #333;
  transition: transform 250ms ease;
  transform: scale(1);
  &:hover {
    transform: scale(1.1);
    & ${InnerButtonHolder} {
      opacity: 1;
    }
  }
  
  @media (max-width: 1023px) {
    & ${InnerButtonHolder} {
      opacity: 1;
    }
  }
`;

const TopFlourish = styled.div`
  border-bottom: 4px solid currentColor;
  left: 50%;
  margin-left: -20px;
  position: absolute;
  top: 0;
  width: 40px;
`;

const CaptainTopFlourish = styled.div`
  color: currentColor;
  display: flex;
  flex-direction: row;
  width: 100%;

  & > div {
    flex: 1;
    font-weight: bold;
    padding-bottom: 3px;
    text-align: center;
    text-transform: uppercase;
  }
  &:before,
  &:after {
    content: '';
    display: block;
    border-bottom: 6px solid currentColor;
    width: 30%;
  }
`;

const NavIconFlourish = styled(NavIcon)`
  position: absolute;
  bottom: -10px;
  left: 50%;
  margin-left: -15px;
`;

const OuterContainer = styled.div`
  color: ${p => p.assigned ? p.theme.colors.main : '#444'};
  & ${CardContainer} {
    opacity: ${p => {
      if (p.assigned) return 1;
      return p.clickable ? 0.75 : 0.5;
    }};
    transform: translateY(0);
    transition: opacity 250ms ease, transform 250ms ease;
  }
  & ${CrewContainer} {
    background: #111;
    transition: background 250ms ease;
  }
  & > svg > polygon {
    fill: #111;
    transition: fill 250ms ease;
  }
  & ${ButtonHolder} {
    opacity: 0;
    transition: opacity 250ms ease;
  }

  ${p => p.clickable && `
    cursor: ${p.theme.cursors.active};
    &:hover {
      & ${CardContainer} {
        opacity: 1;
      }
      & ${CrewContainer} {
        background: #181818;
      }
      & > svg > polygon {
        fill: #181818 !important;
      }
    }
  `}

  ${p => p.assigned && `
    &:hover {
      & ${CardContainer} {
        transform: translateY(-20px);
      }
      & ${CrewContainer} {
        background: #181818;
      }
      & ${ButtonHolder} {
        opacity: 1;
      }
      & > svg > polygon {
        fill: #181818 !important;
      }
    }
  `}

  & > svg {
    height: 40px;
    width: 100%;
  }

  @media (max-width: 560px) {
    width: 100%;
    ${p => p.slot > 0 && `
      &:before {
        content: '| ${p.slot + 1} |';
        display: block;
        font-size: 22px;
        margin: 20px 0 8px;
        text-align: center;
      }
    `}

    & ${ButtonHolder} {
      opacity: 1;
    }
  }
`;

const clickOverlay = {
  alwaysOn: ['button','icon'],
  button: 'Recruit',
  buttonAttention: true,
  disableHover: true,
  icon: <PlusIcon />,
  rgb: theme.colors.mainRGB,
};

const noop = () => {/* no op */};

const inactiveCrewSort = (a, b) => a.name < b.name ? -1 : 1;

const PopperWrapper = (props) => {
  const [refEl, setRefEl] = useState();
  return props.children(refEl, setRefEl);
}

const collapsibleWidth = 1200;

const getPristineString = (ac) => ac.map((c) => c.i).join(',');

const reducer = (state, action) => {
  switch(action.type) {
    case 'INITIALIZE': {
      const { crew, pristine } = action;
      const ac = crew
        .filter((c) => c.activeSlot !== null && c.activeSlot >= 0)
        .sort((a, b) => a.activeSlot - b.activeSlot);
      const ic = crew
        .filter((c) => !(c.activeSlot !== null && c.activeSlot >= 0))
        .sort(inactiveCrewSort);
      return {
        activeCrew: ac,
        inactiveCrew: ic,
        pristine: pristine ? getPristineString(ac) : state.pristine
      }
    }

    case 'ACTIVATE': {
      const { inactiveIndex } = action;
      const { activeCrew, inactiveCrew } = state;
      const ac = [...activeCrew, inactiveCrew[inactiveIndex]];
      const ic = [...inactiveCrew];
      delete ic[inactiveIndex];
      return {
        activeCrew: ac,
        inactiveCrew: [...Object.values(ic)].sort(inactiveCrewSort),
        pristine: state.pristine
      };
    }

    case 'DEACTIVATE': {
      const { slot } = action;
      const { activeCrew, inactiveCrew } = state;

      const ic = [activeCrew[slot], ...inactiveCrew].sort(inactiveCrewSort);
      const ac = [...activeCrew];
      delete ac[slot];

      return {
        activeCrew: [...Object.values(ac)],
        inactiveCrew: ic,
        pristine: state.pristine
      };
    }

    case 'PROMOTE': {
      const { slot } = action;
      const { activeCrew } = state;

      const ac = [...activeCrew];
      delete ac[slot];
      return {
        activeCrew: [
          activeCrew[slot],
          ...Object.values(ac)
        ],
        inactiveCrew: state.inactiveCrew,
        pristine: state.pristine
      };
    }

    default:
      return state;
  }
}

const OwnedCrew = (props) => {
  const { account, token } = useAuth();
  const createStorySession = useCreateStorySession();
  const { data: crewAssignmentData } = useCrewAssignments();
  const queryClient = useQueryClient();
  // const { data: mintable } = useMintableCrew();
  const { data: crew, isLoading: crewIsLoading } = useOwnedCrew();
  const { changeActiveCrew, getPendingActiveCrewChange } = useCrewManager();
  const history = useHistory();
  const { width } = useScreenSize();
  
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);
  const dispatchSeenIntroVideo = useStore(s => s.dispatchSeenIntroVideo);
  const hasSeenIntroVideo = useStore(s => s.hasSeenIntroVideo);

  const { crewRecruitmentStoryId, crewRecruitmentSessionId } = crewAssignmentData || {};

  const [{ activeCrew, inactiveCrew, pristine }, dispatch] = useReducer(reducer, {
    activeCrew: [],
    inactiveCrew: [],
    pristine: ''
  });
  const [hovered, setHovered] = useState();
  const [inactiveCrewCollapsed, setInactiveCrewCollapsed] = useState(width < collapsibleWidth);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => {
    return pristine !== activeCrew.map((c) => c.i).join(',');
  }, [activeCrew, pristine]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (width > collapsibleWidth) setInactiveCrewCollapsed(false);
  }, [width])

  const handleRecruit = useCallback(() => {
    if (isDirty) {
      createAlert({
        type: 'GenericAlert',
        content: 'Please save your active crew changes first.',
        level: 'warning',
        duration: 3000
      });
      playSound('effects.failure');
      return;
    }

    // continue open session...
    if (crewRecruitmentSessionId) {
      history.push(`/crew-assignment/${crewRecruitmentSessionId}`);

    // create new session...
    } else {
      createStorySession.mutate({
        storyId: crewRecruitmentStoryId,
        account
      }, {
        onSuccess: (session) => {
          // (update the "open" crew session id in query cache)
          if (session) {
            const sessionCacheKey = ['assignments', token];
            const currentCacheValue = queryClient.getQueryData(sessionCacheKey);
            queryClient.setQueryData(
              sessionCacheKey,
              {
                ...currentCacheValue,
                crewRecruitmentSessionId: session.id
              }
            );
          }

          // go to assignment
          playSound('effects.success');
          history.push(`/crew-assignment/${session.id}`);
        },
        onError: (err) => {
          console.error(err);
        }
      });
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    account,
    createAlert,
    createStorySession,
    crewRecruitmentSessionId,
    crewRecruitmentStoryId,
    isDirty,
    playSound,
    token
  ]);

  const handleActivate = useCallback((inactiveIndex) => {
    if (activeCrew.length < 5) {
      dispatch({ type: 'ACTIVATE', inactiveIndex });
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Your active crew is already full.',
        level: 'warning',
        duration: 3000
      });
      playSound('effects.failure');
    }
  }, [activeCrew?.length, createAlert, playSound]);

  const handleDeactivate = useCallback((slot) => {
    dispatch({ type: 'DEACTIVATE', slot });
  }, []);

  const handlePromote = useCallback((slot) => {
    dispatch({ type: 'PROMOTE', slot });
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({
      type: 'INITIALIZE',
      crew,
      pristine: true
    });
  }, [crew]);

  const handleSave = useCallback(() => {
    changeActiveCrew({ crew: activeCrew.map((c) => c.i) });
  }, [activeCrew, changeActiveCrew]);

  const handleCutsceneComplete = useCallback(() => {
    dispatchSeenIntroVideo(true);
    // if there is no active or inactive crew, then send straight into assignment
    if (!(inactiveCrew?.length > 0)) {
      handleRecruit();
    }
    
  }, [dispatchSeenIntroVideo, handleRecruit, inactiveCrew?.length]);

  // TODO (enhancement): also show as saving if pending purchase or initialization (that will result in a slot being taken)
  //  probably not high priority b/c user would have had to navigate back here mid-transaction to create an issue
  useEffect(() => {
    const pendingChange = getPendingActiveCrewChange();
    if (pendingChange) {
      setSaving(true);
      if (crew?.length > 0) {
        dispatch({
          type: 'INITIALIZE',
          crew: crew.map((c) => ({
            ...c,
            activeSlot: pendingChange.vars.crew.indexOf(c.i)
          })),
          pristine: false
        });
      }

    } else if (saving) {
      setSaving(false);
      dispatch({
        type: 'INITIALIZE',
        crew: crew.map((c) => ({
          ...c,
          activeSlot: activeCrew.indexOf(c.i)
        })),
        pristine: true
      });

    } else if (crew?.length > activeCrew.length + inactiveCrew.length) {
      dispatch({
        type: 'INITIALIZE',
        crew,
        pristine: true
      });
    }
  }, [crew?.length, getPendingActiveCrewChange, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const slotOrder = useMemo(() => {
    return width < 1500 ? [0,1,2,3,4] : [1,2,0,3,4]
  }, [width]);
  
  if (!token) return null;
  return (
    <>
      <Details title="Owned Crew">
        {!(crew && crewRecruitmentStoryId) && <Loader />}
        {crew && crewRecruitmentStoryId && (
          <Container>
            <Title>
              <h3>
                My Active Crew: {activeCrew.length} / 5
              </h3>
            </Title>
            <ActiveCrew captainFirst={slotOrder[0] === 0}>
              <div>
                {slotOrder.map((slot) => {
                  const crew = activeCrew[slot] || {};
                  const isEmpty = !activeCrew[slot];
                  const isNextEmpty = isEmpty && slot === activeCrew.length && !saving;
                  const isAssigned = !isEmpty;
                  return (
                    <PopperWrapper key={slot}>
                      {(refEl, setRefEl) => (
                        <>
                          <OuterContainer
                            key={slot}
                            clickable={isNextEmpty}
                            onMouseEnter={() => setHovered(slot)}
                            onMouseLeave={() => setHovered()}
                            assigned={isAssigned}
                            slot={slot}>
                            {slot === 0 && (
                              <>
                                <CaptainTopFlourish>
                                  <div>Captain</div>
                                </CaptainTopFlourish>
                                <CrewContainer>
                                  <CardContainer ref={setRefEl} isEmpty={isEmpty} onClick={isNextEmpty ? handleRecruit : noop}>
                                    {isEmpty && <CrewSilhouetteCard overlay={(isNextEmpty) ? clickOverlay : undefined} />}
                                    {!isEmpty && <CrewCard crew={crew} fontSize="95%" noWrapName />}
                                  </CardContainer>
                                  {!isEmpty && (
                                    <ButtonHolder isCaptain>
                                      <IconButton
                                        disabled={saving}
                                        onClick={() => handleDeactivate(slot)}
                                        data-tip="Make Inactive"
                                        data-place="bottom"
                                        scale="0.85">
                                        <DeactivateIcon />
                                      </IconButton>
                                    </ButtonHolder>
                                  )}
                                  <CaptainIcon />
                                </CrewContainer>
                                <TriangleTip extendStroke strokeColor="currentColor" strokeWidth="6" />
                              </>
                            )}

                            {slot !== 0 && (
                              <CrewContainer slot={slot}>
                                <TopFlourish />
                                <CardContainer ref={setRefEl} isEmpty={isEmpty} onClick={isNextEmpty ? handleRecruit : noop}>
                                  {isEmpty && <CrewSilhouetteCard overlay={(isNextEmpty) ? clickOverlay : undefined} />}
                                  {!isEmpty && <CrewCard crew={crew} fontSize="75%" noWrapName />}
                                </CardContainer>
                                {!isEmpty && (
                                  <ButtonHolder>
                                    <IconButton
                                      disabled={saving}
                                      onClick={() => handleDeactivate(slot)}
                                      data-tip="Inactivate"
                                      data-place="bottom"
                                      scale="0.85">
                                      <DeactivateIcon />
                                    </IconButton>
                                    <IconButton
                                      disabled={saving}
                                      onClick={() => handlePromote(slot)}
                                      data-tip="Promote to Captain"
                                      data-place="bottom"
                                      scale="0.85">
                                      <PromoteIcon />
                                    </IconButton>
                                  </ButtonHolder>
                                )}
                                <NavIconFlourish
                                  background={isAssigned ? '' : 'black'}
                                  unselectedBorder="#555"
                                  selected={isAssigned}
                                  size={20}
                                />
                              </CrewContainer>
                            )}
                          </OuterContainer>

                          {!isEmpty && width > 1024 &&  (
                            <CrewInfoPane
                              crew={!isEmpty && crew}
                              cssWhenVisible="transform: translateY(-20px);"
                              referenceEl={refEl}
                              visible={hovered === slot}
                            />
                          )}
                        </>
                      )}
                    </PopperWrapper>
                  );
                })}
              </div>
            </ActiveCrew>
            <ButtonRow>
              {isDirty && !saving && (
                <RevertButton onClick={handleUndo}>
                  Revert
                </RevertButton>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || !isDirty}
                loading={saving}>
                Save Changes
              </Button>
            </ButtonRow>

            {inactiveCrew.length > 0 && (
              <InactiveCrewSection>
                <Title hideBorder onClick={width < collapsibleWidth ? () => setInactiveCrewCollapsed(!inactiveCrewCollapsed) : noop}>
                  <h3>
                    <CrewIcon style={{ fontSize: '125%' }} />
                    Stationed Crew: {inactiveCrew.length}
                  </h3>
                  <IconHR collapsed={inactiveCrewCollapsed}>
                    <ChevronDoubleDownIcon />
                  </IconHR>
                </Title>
                <InactiveCrew collapsed={inactiveCrewCollapsed}>
                  {inactiveCrew.map((crew, i) => (
                    <PopperWrapper key={crew.i}>
                      {(refEl, setRefEl) => (
                        <>
                          <InactiveCardContainer
                            ref={setRefEl}
                            onMouseEnter={() => setHovered(i + 5)}
                            onMouseLeave={() => setHovered()}>
                            <CrewCard
                              crew={crew}
                              fontSize="65%"
                              hideCollectionInHeader
                              showClassInHeader
                              hideFooter
                              noWrapName />
                            <InnerButtonHolder>
                              <IconButton
                                disabled={saving || activeCrew?.length === 5}
                                onClick={() => handleActivate(i)}
                                data-tip="Make Active"
                                data-place="right"
                                scale="0.85">
                                <ActivateIcon />
                              </IconButton>
                            </InnerButtonHolder>
                          </InactiveCardContainer>

                          <CrewInfoPane
                            crew={crew}
                            cssWhenVisible="transform: translateY(-6px);"
                            referenceEl={refEl}
                            visible={hovered === i + 5}
                          />
                        </>
                      )}
                    </PopperWrapper>
                  ))}
                </InactiveCrew>
              </InactiveCrewSection>
            )}
            {inactiveCrew.length === 0 && (
              <EmptyInactiveCrew />
            )}
          </Container>
        )}
      </Details>

      {!crewIsLoading && activeCrew.length === 0 && !hasSeenIntroVideo && createPortal(
        <Cutscene
          source="https://d1c1daundk1ax0.cloudfront.net/influence/goerli/videos/intro.m3u8"
          allowSkip
          onComplete={handleCutsceneComplete}
        />,
        document.body
      )}
    </>
  );
};

export default OwnedCrew;
