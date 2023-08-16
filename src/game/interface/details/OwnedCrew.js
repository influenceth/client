import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import LoadingIcon from 'react-spinners/PuffLoader';

import Button from '~/components/ButtonAlt';
import CrewCard from '~/components/CrewCard';
import CrewmateInfoPane from '~/components/CrewmateInfoPane';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import Details from '~/components/DetailsModal';
import IconButton from '~/components/IconButton';
import {
  CaptainIcon,
  CrewIcon,
  ChevronDoubleDownIcon as DeactivateIcon,
  ChevronDoubleUpIcon as ActivateIcon,
  PlusIcon,
  PromoteIcon,
  ChevronDoubleDownIcon,
  CheckIcon
} from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrewManager from '~/hooks/useCrewManager';
import useScreenSize from '~/hooks/useScreenSize';
import useStore from '~/hooks/useStore';
import theme from '~/theme.js';
import { useHistory } from 'react-router-dom';
import { boolAttr } from '~/lib/utils';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 30px;
  transition: opacity 250ms ease;

  @media (min-width: 1024px) and (max-width: 1600px) {
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

const CrewCredits = styled.div``;
const Title = styled.div`
  position: relative;
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
  & ${CrewCredits} {
    color: ${p => p.theme.colors.success};
    position: absolute;
    right: 0;
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
    grid-template-columns: ${p => `repeat(5, minmax(auto, ${Math.max(60, 0.7 * (p.height - 125))}px))`};
    justify-content: center;
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
      justify-content: flex-start;
      overflow-x: hidden;
      overflow-y: visible;
      max-height: 100%;
      width: 100%;
    }
  }

  @media (min-width: 1470px) {
    margin-bottom: -40px;
    & > div {
      grid-template-columns: ${p => `repeat(5, minmax(auto, ${0.7 * (p.height - 85)}px))`};
    }
  }
`;

const CrewmateContainer = styled.div`
  padding: ${p => p.slot === 0 ? '28px 20px 32px' : '32px 12px'};
  position: relative;
  & > svg {
    color: currentColor;
    font-size: 30px;
    left: 50%;
    margin-left: -46px;
    position: absolute;
    bottom: -20px;
  }
`;

const ButtonHolder = styled.div`
  bottom: 18px;
  display: flex;
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
    padding: 0 6px 3px;
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
  & ${CrewmateContainer} {
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
      & ${CrewmateContainer} {
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
      & ${CrewmateContainer} {
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

const noop = () => {/* no op */};

const inactiveCrewSort = (a, b) => a.name < b.name ? -1 : 1;

const PopperWrapper = (props) => {
  const [refEl, setRefEl] = useState();
  return props.children(refEl, props.disableRefSetter ? noop : setRefEl);
}

const collapsibleWidth = 1200;

const getPristineString = (ac) => ac.map((c) => c.i).join(',');

const reducer = (state, action) => {
  switch(action.type) {
    case 'INITIALIZE': {
      const { crew, pristine } = action;
      const ac = crew
        .filter((c) => parseInt(c.activeSlot) > -1)
        .sort((a, b) => a.activeSlot - b.activeSlot);
      const ic = crew
        .filter((c) => !(parseInt(c.activeSlot) > -1))
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

const OwnedCrew = () => {
  const { account, token } = useAuth();
  const createStorySession = useCreateStorySession();
  const { data: crewAssignmentData, isLoading: assignmentsAreLoading } = useCrewAssignments();
  const queryClient = useQueryClient();
  const { crew: selectedCrew, crews: allCrews, crewmateMap, loading: crewIsLoading } = useCrewContext();
  const { changeActiveCrew, getPendingActiveCrewChange, getPendingCrewmate, crewCredits } = useCrewManager();
  const history = useHistory();
  const { height, width } = useScreenSize();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);
  const interfaceHidden = useStore(s => s.graphics.hideInterface);

  const { crewRecruitmentStoryId, crewRecruitmentSessionId } = crewAssignmentData || {};

  const activeCrewmateContainer = useRef();

  const [{ activeCrew, inactiveCrew, pristine }, dispatch] = useReducer(reducer, {
    activeCrew: [],
    inactiveCrew: [],
    pristine: ''
  });
  const [activeCrewHeight, setActiveCrewHeight] = useState(null);
  const [creatingSession, setCreatingSession] = useState();
  const [hovered, setHovered] = useState();
  const [inactiveCrewCollapsed, setInactiveCrewCollapsed] = useState(width < collapsibleWidth);
  const [saving, setSaving] = useState(false);

  const isDataLoading = !token || assignmentsAreLoading || crewIsLoading;

  const crew = useMemo(() => {
    if (crewIsLoading) return [];
    const activeCrew = (selectedCrew?.Crew.roster || []).map((i, index) => ({ ...crewmateMap[i], activeSlot: index + 1 }));
    const activeInAnyCrewIds = (allCrews || []).reduce((acc, c) => [...acc, ...c.roster], []);
    const inactiveCrew = Object.values(crewmateMap || {})
      .filter((crewmate) => crewmate.Crewmate.class && !activeInAnyCrewIds.includes(crewmate.i))
      .map((c) => ({ ...c, activeSlot: -1 }));
    return [...activeCrew, ...inactiveCrew];
  }, [selectedCrew, allCrews, crewmateMap, crewIsLoading]);

  const isDirty = useMemo(() => {
    return pristine !== activeCrew.map((c) => c.i).join(',');
  }, [activeCrew, pristine]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecruit = useCallback(() => {
    if (isDataLoading || creatingSession) return;

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
    } else if (crewRecruitmentStoryId) {
      setCreatingSession(true);
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
          setCreatingSession(false);

          // go to assignment
          playSound('effects.success');
          history.push(`/crew-assignment/${session.id}`);
        },
        onError: (err) => {
          console.error(err);
          setCreatingSession(false);
        }
      });
    }
  }, [ // eslint-disable-line react-hooks/exhaustive-deps
    account,
    createAlert,
    createStorySession,
    crewRecruitmentSessionId,
    crewRecruitmentStoryId,
    isDataLoading,
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
    changeActiveCrew({ crewId: selectedCrew?.i, crewmates: activeCrew.map((c) => c.i) });
  }, [activeCrew, changeActiveCrew, selectedCrew]);

  const handleActiveCrewHeight = useCallback(() => {
    if (activeCrewmateContainer.current) {
      setActiveCrewHeight(activeCrewmateContainer.current.clientHeight || 0);
    }
  }, []);

  useEffect(() => {
    if (width > collapsibleWidth) setInactiveCrewCollapsed(false);
  }, [width]);

  useEffect(() => {
    if (!token || isDataLoading) return;

    const pendingPurchase = getPendingCrewmate();
    const pendingChange = getPendingActiveCrewChange();
    if (pendingPurchase) {
      // console.log('pendingPurchase', pendingPurchase);
      setSaving(true);
      dispatch({
        type: 'INITIALIZE',
        crew: [
          ...(crew || []),
          {
            ...(pendingPurchase.vars.features || {}),
            name: pendingPurchase.vars.name,
            traits: Object.values(pendingPurchase.vars.traits || {}).map((t) => t.i),
            activeSlot: activeCrew?.length || 0
          }
        ],
        pristine: false
      });
    } else if (pendingChange) {
      setSaving(true);
      if (crew?.length > 0) {
        dispatch({
          type: 'INITIALIZE',
          crew: crew.map((c) => ({
            ...c,
            activeSlot: (pendingChange.vars.crewmates || []).indexOf(c.i)
          })),
          pristine: false
        });
      }

    } else if (saving) {
      setSaving(false);
      dispatch({
        type: 'INITIALIZE',
        crew: (crew || []).map((c) => ({
          ...c,
          activeSlot: activeCrew.findIndex((ac) => ac.i === c.i)
        })),
        pristine: true
      });

    } else if (crew?.length !== activeCrew.length + inactiveCrew.length) {
      dispatch({
        type: 'INITIALIZE',
        crew,
        pristine: true
      });
    }
  }, [isDataLoading, crew?.length, getPendingActiveCrewChange, getPendingCrewmate, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  // if crew is loaded but there is new crew (and no pending tx), jump straight into recruitment
  useEffect(() => {
    if (!isDataLoading && crew.length === 0) {
      // console.log(getPendingActiveCrewChange(), getPendingCrewmate());
      if (!(getPendingActiveCrewChange() || getPendingCrewmate())) {
        handleRecruit();
      }
    }
  }, [isDataLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const slotOrder = useMemo(() => {
    return width <= 560 ? [0,1,2,3,4] : [1,2,0,3,4]
  }, [width]);

  useEffect(() => {
    if (isDataLoading || interfaceHidden) return;
    setTimeout(handleActiveCrewHeight, 0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, handleActiveCrewHeight, isDataLoading, inactiveCrew?.length > 0, interfaceHidden]);

  const clickOverlay = useMemo(() => ({
    alwaysOn: ['button','icon'],
    button: 'Recruit',
    buttonAttention: !creatingSession,
    buttonStyle: activeCrewHeight < 320 && (activeCrewHeight < 275 ? { display: 'none' } : { fontSize: '10px' }),
    disableHover: true,
    icon: creatingSession ? <div style={{ height: 60, width: 60 }}><LoadingIcon color={theme.colors.main} /></div> : <PlusIcon />,
    rgb: theme.colors.mainRGB,
  }), [activeCrewHeight, creatingSession]);

  if (isDataLoading) return null;
  return (
    <Details title="Owned Crew" width="max">
      {!(crew?.length > 0 && crewRecruitmentStoryId) && <Loader />}
      {crew?.length > 0 && crewRecruitmentStoryId && (
        <Container style={{ opacity: activeCrewHeight > 0 ? 1 : 0 }}>
          <Title>
            {crewCredits?.length > 0 && <CrewCredits><CheckIcon /> {crewCredits?.length} credit{crewCredits?.length === 1 ? '' : 's'} remaining</CrewCredits>}
            <h3>
              My Active Crew: {activeCrew.length} / 5
            </h3>
          </Title>
          <ActiveCrew
            ref={activeCrewmateContainer}
            captainFirst={slotOrder[0] === 0}
            height={activeCrewHeight}>
            <div>
              {slotOrder.map((slot) => {
                const crewmate = activeCrew[slot] || {};
                const isEmpty = !activeCrew[slot];
                const isNextEmpty = isEmpty && slot === activeCrew.length && !saving;
                const isAssigned = !isEmpty;
                return (
                  <PopperWrapper key={slot} disableRefSetter={activeCrewHeight === null}>
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
                              <CrewmateContainer>
                                <CardContainer ref={setRefEl} isEmpty={isEmpty} onClick={isNextEmpty && !creatingSession ? handleRecruit : noop}>
                                  {isEmpty && <CrewSilhouetteCard overlay={(isNextEmpty) ? clickOverlay : undefined} />}
                                  {!isEmpty && <CrewCard
                                    crewmate={crewmate}
                                    fontSize="95%"
                                    noWrapName
                                    onClick={() => history.push(`/crew/${crewmate.i}`)} />}
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
                              </CrewmateContainer>
                              <TriangleTip extendStroke strokeColor="currentColor" strokeWidth="6" />
                            </>
                          )}

                          {slot !== 0 && (
                            <CrewmateContainer slot={slot}>
                              <TopFlourish />
                              <CardContainer ref={setRefEl} isEmpty={isEmpty} onClick={isNextEmpty && !creatingSession ? handleRecruit : noop}>
                                {isEmpty && <CrewSilhouetteCard overlay={(isNextEmpty) ? clickOverlay : undefined} />}
                                {!isEmpty && <CrewCard
                                  crewmate={crewmate}
                                  fontSize="75%"
                                  noWrapName
                                  onClick={() => history.push(`/crew/${crewmate.i}`)} />}
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
                            </CrewmateContainer>
                          )}
                        </OuterContainer>

                        {!isEmpty && width > 1024 &&  (
                          <CrewmateInfoPane
                            crewmate={!isEmpty && crewmate}
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
              disabled={boolAttr(saving || !isDirty)}
              isTransaction
              loading={boolAttr(saving)}>
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
                {inactiveCrew.map((crewmate, i) => (
                  <PopperWrapper key={crewmate.i}>
                    {(refEl, setRefEl) => (
                      <>
                        <InactiveCardContainer
                          ref={setRefEl}
                          onMouseEnter={() => setHovered(i + 5)}
                          onMouseLeave={() => setHovered()}>
                          <CrewCard
                            crewmate={crewmate}
                            fontSize="65%"
                            hideCollectionInHeader
                            showClassInHeader
                            hideFooter
                            noWrapName
                            onClick={() => history.push(`/crew/${crewmate.i}`)} />
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

                        <CrewmateInfoPane
                          crewmate={crewmate}
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
  );
};

export default OwnedCrew;
