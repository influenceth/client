import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from 'react-query';
import styled from 'styled-components';
import { toCrewClass, toCrewCollection, toCrewTitle, toCrewTrait } from 'influence-utils';
import { MdAdd as PlusIcon } from 'react-icons/md';
import { usePopper } from 'react-popper';

import Button from '~/components/Button';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import CrewSilhouetteCard from '~/components/CrewSilhouetteCard';
import DataReadout from '~/components/DataReadout';
import Details from '~/components/Details';
import IconButton from '~/components/IconButton';
import {
  CaptainIcon,
  CrewIcon,
  ChevronDoubleDownIcon as DeactivateIcon,
  ChevronDoubleUpIcon as ActivateIcon,
  PromoteIcon
} from '~/components/Icons';
import Loader from '~/components/Loader';
import NavIcon from '~/components/NavIcon';
import useAuth from '~/hooks/useAuth';
import useCreateStorySession from '~/hooks/useCreateStorySession';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import useSettleCrew from '~/hooks/useSettleCrew';
import useStore from '~/hooks/useStore';
import useOwnedAsteroidsCount from '~/hooks/useOwnedAsteroidsCount';
import theme from '~/theme.js';
import { useHistory } from 'react-router-dom';
import TriangleTip from '~/components/TriangleTip';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 30px;
`;

const Title = styled.h3`
  align-items: center;
  border-bottom: 1px solid #2b2b2b;
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
`;

const ActiveCrew = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0;
  justify-content: center;
  margin-bottom: -40px;
  max-width: 100%;
  padding-top: 5px;

  & > div {
    align-items: center;
    display: grid;
    grid-gap: 12px;
    grid-template-columns: repeat(2, minmax(175px, 18.5fr)) minmax(200px, 26fr) repeat(2, minmax(175px, 18.5fr));
    width: 92%;
  }
`;

const CrewContainer = styled.div`
  padding: ${p => p.isCaptain ? '28px 20px 32px' : '32px 12px'};
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
  display: flex;
  justify-content: flex-end;
  padding: 15px 0;
  position: relative;
  z-index: 1;
`;

const EmptyInactiveCrew = styled.div`
  border-top: 1px solid #2b2b2b;
  height: 50px;
`;

const InactiveCrewSection = styled.div`
  position: relative;
  top: -45px;
  margin-bottom: -45px;
`;

const InactiveCrew = styled.div`
  overflow-y: hidden;
  overflow-x: auto;
  padding: 12px 5px 4px;
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

const InfoTooltip = styled.div`
  background: rgba(16,16,16,0.95);
  border: 1px solid #333;
  padding: 13px 13px 0;
  pointer-events: none;
  margin-bottom: 6px;
  opacity: 0;
  transform: translateY(0);
  transition: opacity 250ms ease, transform 250ms ease;
  width: 360px;
  & > h3 {
    margin: 0 0 7px;
  }
  & > article {
    border: solid #333;
    border-width: 1px 0;
    padding: 7px 0;
    display: flex;
    flex-direction: row;
    font-size: 12px;
    & > div:first-child {
      font-size: 25px;
      width: 41px;
      text-align: center;
    }
    & label {
      color: #676767;
    }
    &:last-child {
      border-bottom: 0;
    }
  }
  & > div {
    display: flex;
    flex-wrap: wrap;
    padding: 7px 0;
  }
  
  ${p => p.visible && `
    opacity: 1;
    transform: translateY(${p.isInactiveCrew ? '-6px' : '-20px'});
  `}
`;
const Trait = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  font-size: 36px;
  padding-right: 7px;
  width: 50%;
  & h6 {
    color: #676767;
    font-size: 12px;
    margin: 0 0 0 6px;
  }
`;

const OuterContainer = styled.div`
  color: ${p => p.selected ? p.theme.colors.main : '#444'};
  & ${CardContainer} {
    opacity: ${p => {
      if (p.selected) return 1;
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

  ${p => p.selected && `
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
`;

const clickOverlay = {
  alwaysOn: ['button','icon'],
  button: 'Recruit',
  buttonAttention: true,
  disableHover: true,
  icon: <PlusIcon />,
  rgb: theme.colors.mainRGB,
};

// TODO: move to separate file
const CrewInfoPane = ({ crew, referenceEl, isInactiveCrew, visible }) => {
  const [popperEl, setPopperEl] = useState();
  const { styles, attributes } = usePopper(referenceEl, popperEl, {
    placement: 'top'
  });
  
  if (!crew) return null;
  return createPortal(
    <div ref={setPopperEl} style={{ ...styles.popper, zIndex: 1000 }} {...attributes.popper}>
      <InfoTooltip visible={visible} isInactiveCrew={isInactiveCrew}>
        <h3>{crew.name || `Crew Member #${crew.i}`}</h3>
        <article>
          <div>
            <CrewClassIcon crewClass={crew.crewClass} />
          </div>
          <div style={{ lineHeight: '1.6em' }}>
            <DataReadout label="Class" slim inheritFontSize>{toCrewClass(crew.crewClass)}</DataReadout>
            <DataReadout label="Title" slim inheritFontSize>{toCrewTitle(crew.title)}</DataReadout>
            <DataReadout label="Collection" slim inheritFontSize>{toCrewCollection(crew.crewCollection)}</DataReadout>
          </div>
        </article>
        {crew.traits.length > 0 && (
          <div>
            {crew.traits.map((trait) => {
              const { name } = toCrewTrait(trait) || {};
              if (name) {
                return (
                  <Trait key={trait}>
                    <CrewTraitIcon trait={trait} hideHexagon />
                    <h6>{name}</h6>
                  </Trait>
                );
              }
              return null;
            })}
          </div>
        )}
      </InfoTooltip>
    </div>,
    document.body
  );
}

const PopperWrapper = (props) => {
  const [refEl, setRefEl] = useState();
  return props.children(refEl, setRefEl);
}

const OwnedCrew = (props) => {
  const { token, web3: { account } } = useAuth();
  const createStorySession = useCreateStorySession();
  const { data: crewAssignmentData } = useCrewAssignments();
  const queryClient = useQueryClient();
  const { data: crew } = useOwnedCrew();
  const history = useHistory();
  
  const playSound = useStore(s => s.dispatchSoundRequested);

  const { crewRecruitmentStoryId, crewRecruitmentSessionId } = crewAssignmentData || {};

  // TODO: ?
  // const { data: mintable } = useMintableCrew();
  // const { data: ownedCount } = useOwnedAsteroidsCount();

  const [hovered, setHovered] = useState();
  const [activeCrew, setActiveCrew] = useState([]);
  const [inactiveCrew, setInactiveCrew] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // TODO: should sync state when crew is updated
  useEffect(() => {
    if (crew) {
      setActiveCrew((crew || []).length ? [crew[0], crew[1]] : []);
      setInactiveCrew((crew || []).slice(2));
      setIsDirty(false);
    }
  }, [!!crew]);

  // TODO: loading
  // TODO: useCallback

  const handleRecruit = () => {
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
  };

  useEffect(() => {
    const current = activeCrew.map((c) => c.i).join(',');
    const pristine = (
      (crew || []).length ? [crew[0], crew[1]] : []
    ).map((c) => c.i).join(',');
    setIsDirty(current !== pristine);
  }, [activeCrew]);

  const handleActivate = (inactiveIndex) => {
    // is there a slot?
    if (activeCrew.length < 5) {
      setActiveCrew([...activeCrew, inactiveCrew[inactiveIndex]]);

      const newInactive = [...inactiveCrew];
      delete newInactive[inactiveIndex];
      setInactiveCrew([...Object.values(newInactive)]);
    } else {
      // TODO: error -- no slot
    }
  };
  const handleDeactivate = (slot) => {
    setInactiveCrew([activeCrew[slot], ...inactiveCrew]);

    const newActive = [...activeCrew];
    delete newActive[slot];
    setActiveCrew([...Object.values(newActive)]);
  };
  const handlePromote = (slot) => {
    const newActive = [...activeCrew];
    delete newActive[slot];
    setActiveCrew([
      activeCrew[slot],
      ...Object.values(newActive)
    ]);
  };

  const handleSave = () => {

  };

  return (
    <Details title="Owned Crew">
      {!(crew && crewRecruitmentStoryId) && <Loader />}
      {crew && crewRecruitmentStoryId && (
        <Container>
          <Title>My Active Crew: {activeCrew.length} / 5</Title>
          <ActiveCrew>
            <div>
              {[1,2,0,3,4].map((slot) => {
                const crew = activeCrew[slot] || {};
                const isEmpty = !activeCrew[slot];
                const isNextEmpty = isEmpty && slot === activeCrew.length;
                const isSelected = !isEmpty;
                return (
                  <PopperWrapper key={slot}>
                    {(refEl, setRefEl) => (
                      <>
                        <OuterContainer
                          key={slot}
                          clickable={isNextEmpty}
                          onClick={handleRecruit}
                          onMouseEnter={() => setHovered(slot)}
                          onMouseLeave={() => setHovered()}
                          selected={isSelected}>
                          {slot === 0 && (
                            <>
                              <CaptainTopFlourish>
                                <div>Captain</div>
                              </CaptainTopFlourish>
                              <CrewContainer isCaptain>
                                <CardContainer isEmpty={isEmpty} ref={setRefEl}>
                                  {isEmpty && <CrewSilhouetteCard overlay={isNextEmpty ? clickOverlay : undefined} />}
                                  {!isEmpty && <CrewCard crew={crew} fontSize="95%" noWrapName />}
                                </CardContainer>
                                {!isEmpty && (
                                  <ButtonHolder isCaptain>
                                    <IconButton
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
                            <CrewContainer>
                              <TopFlourish />
                              <CardContainer isEmpty={isEmpty} ref={setRefEl}>
                                {isEmpty && <CrewSilhouetteCard overlay={isNextEmpty ? clickOverlay : undefined} />}
                                {!isEmpty && <CrewCard crew={crew} fontSize="75%" noWrapName />}
                              </CardContainer>
                              {!isEmpty && (
                                <ButtonHolder>
                                  <IconButton
                                    onClick={() => handleDeactivate(slot)}
                                    data-tip="Inactivate"
                                    data-place="bottom"
                                    scale="0.85">
                                    <DeactivateIcon />
                                  </IconButton>
                                  <IconButton
                                    onClick={() => handlePromote(slot)}
                                    data-tip="Promote to Captain"
                                    data-place="bottom"
                                    scale="0.85">
                                    <PromoteIcon />
                                  </IconButton>
                                </ButtonHolder>
                              )}
                              <NavIconFlourish
                                background={isSelected ? '' : 'black'}
                                unselectedBorder="#555"
                                selected={isSelected}
                                size={20}
                              />
                            </CrewContainer>
                          )}
                        </OuterContainer>

                        {!isEmpty && (
                          <CrewInfoPane
                            crew={!isEmpty && crew}
                            visible={hovered === slot}
                            referenceEl={refEl} />
                        )}
                      </>
                    )}
                  </PopperWrapper>
                );
              })}
            </div>
          </ActiveCrew>
          <ButtonRow>
            <Button
              onClick={handleSave}
              disabled={!isDirty || activeCrew.length === 0}>
              Save Changes
            </Button>
          </ButtonRow>

          {inactiveCrew.length > 0 && (
            <InactiveCrewSection>
              <Title>
                <CrewIcon style={{ fontSize: '125%' }} />
                Stationed Crew: {inactiveCrew.length}
              </Title>
              <InactiveCrew>
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
                            hideFooter
                            noWrapName />
                          <InnerButtonHolder>
                            <IconButton
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
                          visible={hovered === i + 5}
                          isInactiveCrew
                          referenceEl={refEl} />
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
