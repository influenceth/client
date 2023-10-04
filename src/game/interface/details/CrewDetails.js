import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Building, Entity, Name, Time } from '@influenceth/sdk';
import LoadingAnimation from 'react-spinners/PuffLoader';

import CoverImageSrc from '~/assets/images/modal_headers/OwnedCrew.png';
import Button from '~/components/ButtonAlt';
import CrewCardFramed, { EmptyCrewCardFramed } from '~/components/CrewCardFramed';
import CrewmateInfoPane from '~/components/CrewmateInfoPane';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import Details from '~/components/DetailsModal';
import FoodStatus from '~/components/FoodStatus';
import {
  CheckIcon,
  CloseIcon,
  EditIcon,
  MyAssetIcon,
  PlusIcon
} from '~/components/Icons';
import LogEntry from '~/components/LogEntry';
import TabContainer from '~/components/TabContainer';
import TextInput from '~/components/TextInput';
import useActivities from '~/hooks/useActivities';
import useChangeName from '~/hooks/useChangeName';
import useCrew from '~/hooks/useCrew';
import useCrewContext from '~/hooks/useCrewContext';
import useCrewmates from '~/hooks/useCrewmates';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import useNameAvailability from '~/hooks/useNameAvailability';
import useStore from '~/hooks/useStore';
import formatters from '~/lib/formatters';
import { boolAttr, locationsArrToObj } from '~/lib/utils';
import theme from '~/theme';
import useEarliestActivity from '~/hooks/useEarliestActivity';
import useAuth from '~/hooks/useAuth';

const borderColor = 'rgba(200, 200, 200, 0.15)';
const breakpoint = 1375;

const tabContainerCss = css`
  color: white;
  font-size: 15px;
  flex: 1;
  @media (min-height: 950px) {
    max-height: 500px;
  }
  @media (max-width: ${breakpoint}px) {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.05);
    border: 2px solid rgba(${p => p.theme.colors.mainRGB}, 0.15);
    border-left: none;
    border-right: none;
    box-shadow: -4px 0 8px rgba(${p => p.theme.colors.mainRGB}, 0.25);
    margin-top: 0;
  }
`;

const History = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: 10px;
  overflow: hidden;
  padding: 0 15px;
`;

const LogHeader = styled.ul``;
const Log = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  & ul {
    display: flex;
    flex-direction: column;
    list-style-type: none;
    margin: 0;
    padding: 5px 0;
  }
  & ${LogHeader} {
    @media (max-width: ${breakpoint}px) {
      display: none;
    }
  }

  & > div {
    border-top: 1px solid ${borderColor};
    flex: 1;
    height: 100%;
    overflow-y: auto;
    padding-right: 5px;
    margin-right: -5px;
    & ul {
      margin-right: -5px;
      @media (max-width: ${breakpoint}px) {
        margin-right: 0;
      }
    }

    @media (max-width: ${breakpoint}px) {
      border-top: none;
      height: auto;
      max-height: calc(100vh - 200px);
    }
  }

  @media (max-width: ${breakpoint}px) {
    display: block;
    margin: 0 -10px;
  }
`;
const EmptyLogEntry = styled.li`
  padding-top: 50px;
  text-align: center;
`;

const foldOffset = 28;
const belowFoldMin = 256;

const CoverImage = styled.div`
  height: calc(80% + ${foldOffset}px);
  left: 0;
  max-height: calc(100% - ${foldOffset}px - ${belowFoldMin}px);
  position: absolute;
  top: 0;
  width: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    height: 33%;
    max-height: none;
  }

  &:before {
    background-color: #111;
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: ${p => p.center || 'center center'};
    background-size: cover;
    content: '';
    display: block;
    height: 100%;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%);
    transition:
      background-position 750ms ease-out,
      opacity 750ms ease-out;
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: flex-start;
  margin-top: 60px;
  overflow: hidden;
  padding: 25px 35px;
  position: relative;
  z-index: 1;
`;

const AboveFold = styled.div`
  align-items: stretch;
  display: flex;
  flex-direction: row;
  min-height: 375px;
`;
const CrewDetailsContainer = styled.div`
  flex: 1;
`;
const ManagementContainer = styled.div`
  border-left: 1px solid #363636;
  flex: 0 0 280px;
  margin-left: 30px;
  padding-left: 30px;
  & > div {
    margin-top: 20px;
    &:first-child {
      margin-top: 0;
    }

    & > button {
      margin-bottom: 8px;
      width: 225px;
    }
  }
`;
const MyCrewStatement = styled.div`
  align-items: center;
  color: ${p => p.theme.colors.main};
  display: flex;
  font-weight: bold;
  & > svg {
    font-size: 24px;
    margin-right: 10px;
  }
`;
const Stat = styled.div`
  color: white;
  &:before {
    content: "${p => p.label}:";
    display: block;
    opacity: 0.7;
  }
`;

const NameWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  & > button {
    font-size: 24px;
    margin-right: 15px;
  }
  & > h4 {
    font-size: 30px;
    font-weight: normal;
    margin: 0;
  }
  & > input {
    flex: 1;
    font-size: 30px;
    height: 48px;
  }
`;


const CrewWrapper = styled.div`
  display: flex;
  flex-direction: row;
  margin-left: 64px;
  margin-top: 25px;
  padding-bottom: 50px;
`;

const CrewInfoContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  & > div {
    margin-left: 3px;

    & > svg {
      font-size: 24px;
    }
  }
`;

const TitleBar = styled.div`
  ${CrewInfoContainer} & {
    align-items: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    flex-direction: row;
    font-size: 20px;
    justify-content: space-between;
    margin-left: 7px;
    pointer-events: auto;
    padding: 4px 12px;

    & svg {
      font-size: 18px;
    }
  }
`;

const BaseLocation = styled.div`
  color: white;
  cursor: ${p => p.theme.cursors.active};
  font-size: 14.5px;
  span {
    color: #AAA;
    &:before {
      content: " > ";
    }
  }
  svg {
    color: ${p => p.theme.colors.main};
    margin-right: 2px;
    vertical-align: middle;
  }
`;


const Crewmates = styled.div`
  align-items: flex-start;
  display: flex;
  flex-direction: row;
  margin-bottom: 10px;
  padding-left: 5px;
  & > * {
    margin-left: 10px;
    &:first-child {
      margin-left: 0;
    }
  }
`;

const BelowFold = styled.div`
  flex: 1;
  height: 0;
`;

const noop = () => {/* noop */};

const PopperWrapper = (props) => {
  const [refEl, setRefEl] = useState();
  return props.children(refEl, props.disableRefSetter ? noop : setRefEl);
}

const CrewDetails = ({ crewId, crew, crewmates, isMyCrew, isOwnedCrew, selectCrew }) => {
  const history = useHistory();

  const onSetAction = useStore(s => s.dispatchActionDialog);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const isNameValid = useNameAvailability(Entity.IDS.CREW);
  const { data: activities } = useActivities({ id: crewId, label: Entity.IDS.CREW });
  const { data: earliestActivity, isLoading: earliestLoading } = useEarliestActivity({ id: crewId, label: Entity.IDS.CREW });
  const { changeName, changingName } = useChangeName({ id: crewId, label: Entity.IDS.CREW });

  const hydratedLocation = useHydratedLocation(locationsArrToObj(crew.Location?.locations));

  const [editing, setEditing] = useState();
  const [hovered, setHovered] = useState();
  const [newName, setNewName] = useState(crew.Name?.name || '');

  // reset
  useEffect(() => {
    if (editing) setNewName(crew.Name?.name || '');
  }, [editing]);

  useEffect(() => {
    if (changingName) setEditing(false);
  }, [changingName])

  const saveName = useCallback(async () => {
    if (await isNameValid(newName)) {
      changeName(newName);
    }
  }, [newName]);

  const onClickCrewmate = useCallback((crewmate) => () => {
    history.push(`/crewmate/${crewmate.id}`);
  }, []);

  const onClickRecruit = useCallback(() => {
    if (hydratedLocation?.building?.Building?.buildingType === Building.IDS.HABITAT) {
      history.push(`/recruit/${crew.id}/${hydratedLocation.building.id}`);
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Your crew must be stationed in a habitat to recruit new members.',
        level: 'warning',
        duration: 6000
      })
    }
  }, [crew, hydratedLocation?.building]);

  const onClickNewCrew = useCallback(() => {
    history.push(`/recruit/0`);
  }, []);

  const onClickLocation = useCallback(() => {
    hydratedLocation.onLink();
    history.push('/');
  }, [hydratedLocation]);

  const formationDate = useMemo(() => {
    if (earliestLoading) return '...';
    if (!earliestActivity) return 'Unknown';
    return `${Time.fromUnixTime(earliestActivity?.event?.timestamp, false).toGameClockADays(true)} SA`;
  }, [earliestActivity, earliestLoading]);

  // TODO: was this just debug? remove?
  const ready = true;
  // const [ready, setReady] = useState();
  // useEffect(() => {
  //   setTimeout(() => setReady(true), 1000);
  // }, []);

  // TODO: we need to support empty crews here

  return (
    <>
      <MainContainer>
        <AboveFold>
          <CrewDetailsContainer>
            <NameWrapper>
              {editing
                ? (
                  <>
                    <Button size="hugeicon" subtle disabled={boolAttr(changingName)} onClick={saveName}><CheckIcon /></Button>
                    <Button size="hugeicon" subtle disabled={boolAttr(changingName)} onClick={() => setEditing()}><CloseIcon /></Button>
                    <TextInput 
                      initialValue={crew.Name?.name || ''}
                      minlength={Name.TYPES[Entity.IDS.CREW].min}
                      maxlength={Name.TYPES[Entity.IDS.CREW].max}
                      pattern={Name.getTypeRegex(Entity.IDS.CREW)}
                      disabled={boolAttr(changingName)}
                      onChange={(v) => setNewName(v)} />
                  </>
                )
                : (
                  <>
                    {isMyCrew && (
                      <Button size="hugeicon" subtle
                        disabled={boolAttr(changingName)}
                        onClick={() => setEditing(true)}>
                        {changingName ? <LoadingAnimation color="white" size="1em" /> : <EditIcon />}
                      </Button>
                    )}
                    <h4>{changingName ? newName : formatters.crewName(crew)}</h4>
                  </>
                )
              }
            </NameWrapper>

            <CrewWrapper>
              <PopperWrapper disableRefSetter={!ready}>
                {(refEl, setRefEl) => {
                  const crewmate = crewmates?.[0];
                  if (!crewmate) {
                    return (
                      <EmptyCrewCardFramed isCaptain onClick={isMyCrew ? onClickRecruit : null} width={146}>
                        {isMyCrew && <PlusIcon />}
                      </EmptyCrewCardFramed>
                    );
                  }
                  return (
                    <>
                      <span ref={setRefEl}>
                        <CrewCardFramed
                          borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                          crewCardProps={{ hideHeader: false, noWrapName: true }}
                          crewmate={crewmate}
                          isCaptain
                          onClick={onClickCrewmate(crewmate)}
                          onMouseEnter={() => setHovered(0)}
                          onMouseLeave={() => setHovered()}
                          width={180} />
                      </span>
                      <CrewmateInfoPane
                        crewmate={crewmate}
                        css="transform: translateY(25px);"
                        cssWhenVisible="transform: translateY(3px);"
                        referenceEl={refEl}
                        visible={hovered === 0}
                      />
                    </>
                  );
                }}
              </PopperWrapper>

              <CrewInfoContainer>
                <Crewmates>
                  {Array.from(Array(4)).map((_, i) => {
                    const crewmate = crewmates?.[i + 1];
                    if (!crewmate) {
                      return (
                        <EmptyCrewCardFramed key={i} onClick={isMyCrew ? onClickRecruit : null} width={146}>
                          {isMyCrew && <PlusIcon />}
                        </EmptyCrewCardFramed>
                      );
                    }
                    return (
                      <PopperWrapper key={i} disableRefSetter={!ready}>
                        {(refEl, setRefEl) => (
                          <>
                            <span ref={setRefEl}>
                              <CrewCardFramed
                                borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                                crewCardProps={{ hideHeader: false, noWrapName: true }}
                                crewmate={crewmate}
                                onClick={onClickCrewmate(crewmate)}
                                onMouseEnter={() => setHovered(i + 1)}
                                onMouseLeave={() => setHovered()}
                                width={146}
                                noArrow />
                            </span>
                            <CrewmateInfoPane
                              crewmate={crewmate}
                              css="transform: translateY(25px);"
                              cssWhenVisible="transform: translateY(3px);"
                              referenceEl={refEl}
                              visible={hovered === i + 1}
                            />
                          </>
                        )}
                      </PopperWrapper>
                    );
                  })}
                </Crewmates>

                <TitleBar>
                  <BaseLocation onClick={onClickLocation}>
                    <CrewLocationLabel hydratedLocation={hydratedLocation} />
                  </BaseLocation>

                  {/* TODO: potentially link directly to add rations dialog instead */}
                  {/* TODO: implement lastFed or whatever */}
                  <FoodStatus percentage={100} />
                </TitleBar>

                {isMyCrew && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
                    <Button disabled subtle style={{ width: 225 }}>Add Rations</Button>{/* TODO: connect this */}
                  </div>
                )}
              </CrewInfoContainer>

            </CrewWrapper>

            
          </CrewDetailsContainer>
          <ManagementContainer>
            {isOwnedCrew && <MyCrewStatement><MyAssetIcon /> This crew is owned by me.</MyCrewStatement>}
            <Stat label="No. Members">{crew.Crew?.roster?.length || 0}</Stat>
            <Stat label="Formed">{formationDate}</Stat>
            {isMyCrew && (
              <div style={{ paddingTop: 15 }}>
                <Button subtle onClick={() => onSetAction('MANAGE_CREW')}>Manage Crew</Button>
                <Button subtle onClick={onClickNewCrew}>Form New Crew</Button>
                <Button subtle onClick={onClickRecruit}>Recruit Crewmate</Button>
              </div>
            )}
            {isOwnedCrew && !isMyCrew && (
              <div style={{ paddingTop: 15 }}>
                <Button subtle onClick={() => selectCrew(crewId)}>Switch to Crew</Button>
              </div>
            )}
          </ManagementContainer>
        </AboveFold>

        <BelowFold>
          <TabContainer
            containerCss={tabContainerCss}
            iconCss={{}}
            labelCss={{
              minWidth: '50px',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
            tabCss={{ padding: '0 15px', width: 'auto' }}
            tabs={[
              {
                label: 'Crew Log',
              },
              {
                label: 'Mission Statement',
                disabled: true
              }
            ]}
            paneCss={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}
            panes={[
              (
                <History>
                  <Log>
                    <LogHeader>
                      <LogEntry isHeaderRow isTabular />
                    </LogHeader>
                    <div>
                      <ul>
                        {/* TODO: totalCount from api, pagination, custom columns (see mocks) */}
                        {activities?.length > 0
                          ? activities.map((activity) => (
                            <LogEntry
                              key={activity.id}
                              activity={activity}
                              timestampBreakpoint="1500px"
                              isTabular />
                          ))
                          : <EmptyLogEntry>No logs recorded yet.</EmptyLogEntry>
                        }
                      </ul>
                    </div>
                  </Log>
                </History>
              ),
              null,
              null
            ]}
          />
          
        </BelowFold>
      </MainContainer>
    </>
  );
};

const Wrapper = () => {
  const { i } = useParams();
  const { account } = useAuth();
  const { crew: myCrew, selectCrew, loading: myCrewLoading } = useCrewContext();
  const history = useHistory();

  const crewId = Number(i || myCrew?.id);
  const { data: crew, isLoading: crewLoading } = useCrew(crewId);
  const { data: crewmates, isLoading: crewmatesLoading } = useCrewmates(crew?.Crew?.roster || []);

  useEffect(() => {
    if (!crewLoading && !crew) {
      history.replace(`/recruit/0`);
    } else if (!i && myCrew?.id) {
      history.replace(`/crew/${myCrew.id}`);
    }
  }, [crewLoading, crew, myCrew])

  const loading = myCrewLoading || crewLoading || crewmatesLoading;
  return (
    <Details
      edgeToEdge
      headerProps={{ background: 'true', v2: 'true' }}
      onCloseDestination="/"
      contentInnerProps={{ style: { display: 'flex', flexDirection: 'column', height: '100%' } }}
      title={<>Crew Details {crewId === myCrew?.id && <b>My Active Crew</b>}</>}
      width="1250px">
      <CoverImage src={CoverImageSrc} />
      {loading && (
        <div style={{ position: 'absolute', left: 'calc(50% - 30px)', top: 'calc(50% - 30px)' }}>
          <LoadingAnimation color="white" />
        </div>
      )}
      {crew && !loading && (
        <CrewDetails
          crewId={crewId}
          crew={crew}
          crewmates={crewmates}
          isMyCrew={crewId === myCrew?.id}
          isOwnedCrew={crew?.Nft?.owner === account}
          selectCrew={selectCrew}
        />
      )}
    </Details>
  );
};

export default Wrapper;
