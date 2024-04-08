import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Address, Building, Entity, Name, Time } from '@influenceth/sdk';
import LoadingAnimation from 'react-spinners/PuffLoader';

import CoverImageSrc from '~/assets/images/modal_headers/OwnedCrew.png';
import AnnotationBio from '~/components/AnnotationBio';
import Button from '~/components/ButtonAlt';
import CrewmateCardFramed, { EmptyCrewmateCardFramed } from '~/components/CrewmateCardFramed';
import CrewmateInfoPane from '~/components/CrewmateInfoPane';
import CrewLocationLabel from '~/components/CrewLocationLabel';
import Details from '~/components/DetailsModal';
import LiveFoodStatus from '~/components/LiveFoodStatus';
import LiveReadyStatus from '~/components/LiveReadyStatus';
import {
  BlockIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  MyAssetIcon,
  PlusIcon
} from '~/components/Icons';
import TabContainer from '~/components/TabContainer';
import TextInput from '~/components/TextInput';
import useSession from '~/hooks/useSession';
import useChangeName from '~/hooks/actionManagers/useChangeName';
import useConstants from '~/hooks/useConstants';
import useCrewContext from '~/hooks/useCrewContext';
import useEarliestActivity from '~/hooks/useEarliestActivity';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useHydratedLocation from '~/hooks/useHydratedLocation';
import useNameAvailability from '~/hooks/useNameAvailability';
import useStore from '~/hooks/useStore';
import formatters from '~/lib/formatters';
import { nativeBool, reactBool } from '~/lib/utils';
import theme from '~/theme';
import EntityActivityLog from './EntityActivityLog';

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
    mask-image: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.6) 10%, rgba(0, 0, 0, 0.6) 75%, transparent 100%);
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
  & > input {
    flex: 1;
    font-size: 30px;
    height: 48px;
  }
`;
const NameAndStatus = styled.div`
  align-items: flex-end;
  display: flex;
  flex: 1;

  & > h4 {
    flex: 1;
    font-size: 30px;
    font-weight: normal;
    margin: 0;
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

  &:hover, &:hover span {
    color: ${p => p.theme.colors.main};
  }

  svg {
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

const CrewDetails = ({ crewId, crew, isMyCrew, isOwnedCrew, selectCrew }) => {
  const { accountAddress } = useSession();
  const history = useHistory();

  const onSetAction = useStore(s => s.dispatchActionDialog);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const isNameValid = useNameAvailability(crew);
  const { data: earliestActivity, isLoading: earliestLoading } = useEarliestActivity({ id: crewId, label: Entity.IDS.CREW });
  const { changeName, changingName } = useChangeName({ id: crewId, label: Entity.IDS.CREW });

  const { data: TIME_ACCELERATION } = useConstants('TIME_ACCELERATION');

  const hydratedLocation = useHydratedLocation(crew._location);

  const [editing, setEditing] = useState();
  const [hovered, setHovered] = useState();
  const [newName, setNewName] = useState(crew.Name?.name || '');

  const viewingAs = useMemo(() => ({ id: crewId, label: Entity.IDS.CREW }), [crewId]);
  const hasMyCrewmates = useMemo(() => {
    return crew._crewmates.filter((c) => accountAddress && Address.areEqual(accountAddress, c.Nft?.owner))?.length;
  }, [accountAddress, crew._crewmates]);

  // reset
  useEffect(() => {
    if (editing) setNewName(crew.Name?.name || '');
  }, [editing]);

  useEffect(() => {
    if (changingName) setEditing(false);
  }, [changingName])

  const saveName = useCallback(async () => {
    if (await isNameValid(newName, crew?.id)) {
      changeName(newName);
    }
  }, [newName, crew?.id]);

  const onClickCrewmate = useCallback((crewmate) => () => {
    history.push(`/crewmate/${crewmate.id}`);
  }, []);

  const onClickRecruit = useCallback(() => {
    if (hydratedLocation?.building?.Building?.buildingType === Building.IDS.HABITAT) {
      history.push(`/recruit/${crew.id}/${hydratedLocation.building.id}`);
    } else {
      createAlert({
        type: 'GenericAlert',
        data: { content: 'Crew must be stationed in a Habitat to recruit.' },
        level: 'warning',
        duration: 6000
      })
    }
  }, [crew, hydratedLocation?.building]);

  const onClickLocation = useCallback(() => {
    hydratedLocation.onLink();
    history.push('/');
  }, [hydratedLocation]);

  const formationDate = useMemo(() => {
    if (earliestLoading) return '...';
    if (!earliestActivity) return 'Unknown';
    return `${Time.fromUnixSeconds(earliestActivity?.event?.timestamp, TIME_ACCELERATION).toGameClockADays(true)} SA`;
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
                    <Button size="hugeicon" disabled={nativeBool(changingName)} onClick={saveName}><CheckIcon /></Button>
                    <Button size="hugeicon" disabled={nativeBool(changingName)} onClick={() => setEditing()}><CloseIcon /></Button>
                    <TextInput
                      initialValue={crew.Name?.name || ''}
                      minlength={Name.TYPES[Entity.IDS.CREW].min}
                      maxlength={Name.TYPES[Entity.IDS.CREW].max}
                      pattern={Name.getTypeRegex(Entity.IDS.CREW)}
                      disabled={nativeBool(changingName)}
                      onChange={(v) => setNewName(v)} />
                  </>
                )
                : (
                  <>
                    {isMyCrew && (
                      <Button
                        disabled={nativeBool(changingName)}
                        onClick={() => setEditing(true)}
                        size="hugeicon">
                        {changingName ? <LoadingAnimation color="white" size="1em" /> : <EditIcon />}
                      </Button>
                    )}
                    <NameAndStatus>
                      <h4>{changingName ? newName : formatters.crewName(crew)}</h4>
                      <LiveReadyStatus crew={crew} />
                    </NameAndStatus>
                  </>
                )
              }
            </NameWrapper>
            <CrewWrapper>
              <PopperWrapper disableRefSetter={!ready}>
                {(refEl, setRefEl) => {
                  const crewmate = crew._crewmates?.[0];
                  if (!crewmate) {
                    return (
                      <div>
                        <EmptyCrewmateCardFramed isCaptain onClick={(isMyCrew && crew._ready) ? onClickRecruit : null} width={180}>
                          {isMyCrew && crew._ready && <PlusIcon />}
                          {isMyCrew && !crew._ready && <BlockIcon />}
                        </EmptyCrewmateCardFramed>
                      </div>
                    );
                  }
                  return (
                    <>
                      <span ref={setRefEl}>
                        <CrewmateCardFramed
                          borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                          CrewmateCardProps={{ hideHeader: false, noWrapName: true }}
                          crewmate={crewmate}
                          isCaptain
                          onClick={onClickCrewmate(crewmate)}
                          onMouseEnter={() => setHovered(0)}
                          onMouseLeave={() => setHovered()}
                          warnIfNotOwnedBy={crew?.Nft?.owner}
                          width={180} />
                      </span>
                      <CrewmateInfoPane
                        crewmate={crewmate}
                        showOwner={reactBool(!Address.areEqual(crew?.Nft?.owner || '', crewmate?.Nft?.owner || ''))}
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
                    const crewmate = crew._crewmates?.[i + 1];
                    if (!crewmate) {
                      return (
                        <EmptyCrewmateCardFramed key={i} onClick={(isMyCrew && crew._ready) ? onClickRecruit : null} width={146}>
                          {isMyCrew && crew._ready && <PlusIcon />}
                          {isMyCrew && !crew._ready && <BlockIcon />}
                        </EmptyCrewmateCardFramed>
                      );
                    }
                    return (
                      <PopperWrapper key={i} disableRefSetter={!ready}>
                        {(refEl, setRefEl) => (
                          <>
                            <span ref={setRefEl}>
                              <CrewmateCardFramed
                                borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                                CrewmateCardProps={{ hideHeader: false, noWrapName: true }}
                                crewmate={crewmate}
                                onClick={onClickCrewmate(crewmate)}
                                onMouseEnter={() => setHovered(i + 1)}
                                onMouseLeave={() => setHovered()}
                                warnIfNotOwnedBy={crew?.Nft?.owner}
                                width={146}
                                noArrow />
                            </span>
                            <CrewmateInfoPane
                              crewmate={crewmate}
                              showOwner={reactBool(!Address.areEqual(crew?.Nft?.owner || '', crewmate?.Nft?.owner || ''))}
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

                  <LiveFoodStatus crew={crew} onClick={isMyCrew ? () => { onSetAction('FEED_CREW'); } : undefined} />
                </TitleBar>

                {isMyCrew && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
                    <Button onClick={() => onSetAction('FEED_CREW')} style={{ width: 225 }}>Add Rations</Button>
                  </div>
                )}
              </CrewInfoContainer>

            </CrewWrapper>

          </CrewDetailsContainer>
          <ManagementContainer>
            {isOwnedCrew && <MyCrewStatement><MyAssetIcon /> This crew is owned by me.</MyCrewStatement>}
            <Stat label="Crew ID">{crewId || 0}</Stat>
            <Stat label="Formed">{formationDate}</Stat>
            {isMyCrew && (
              <div style={{ paddingTop: 15 }}>
                <Button onClick={() => onSetAction('MANAGE_CREW')}>Manage Crew</Button>
                {crew.Crew?.roster?.length >= 2 && <Button onClick={() => onSetAction('MANAGE_CREW', { exchangeCrewId: 0 })}>Split Crew</Button>}
                <Button disabled={nativeBool(crew.Crew?.roster?.length >= 5) || !crew._ready} onClick={onClickRecruit}>Recruit to Crew</Button>
              </div>
            )}
            {isOwnedCrew && !isMyCrew && (
              <div style={{ paddingTop: 15 }}>
                <Button onClick={() => selectCrew(crewId)}>Switch to Crew</Button>
              </div>
            )}
            {!isMyCrew && hasMyCrewmates > 0 && (
              <div style={{ paddingTop: 15 }}>
                <Button onClick={() => onSetAction('MANAGE_CREW', { crewId })}>Recover Crewmate{hasMyCrewmates === 1 ? '' : 's'}</Button>
              </div>
            )}
          </ManagementContainer>
        </AboveFold>

        <BelowFold>
          <TabContainer
            containerCss={tabContainerCss}
            containerHeight="36px"
            iconCss={{}}
            labelCss={{
              minWidth: '50px',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
            tabCss={{ padding: '0 30px', width: 'auto' }}
            tabs={[
              {
                label: 'Crew Log',
              },
              {
                label: 'Crew Bio',
              }
            ]}
            paneCss={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'hidden' }}
            panes={[
              <EntityActivityLog entity={crew} viewingAs={viewingAs} />,
              <AnnotationBio entity={crew} isEditable={isMyCrew} />
            ]}
          />

        </BelowFold>
      </MainContainer>
    </>
  );
};

const Wrapper = () => {
  const { i } = useParams();
  const { accountAddress, authenticated } = useSession();
  const { crew: myCrew, selectCrew, loading: myCrewLoading } = useCrewContext();
  const history = useHistory();

  const crewId = Number(i || myCrew?.id);
  const { data: crew, isLoading: crewLoading } = useHydratedCrew(crewId);

  const createAlert = useStore(s => s.dispatchAlertLogged);

  useEffect(() => {
    // if id is specified...
    if (i) {
      // ...return to / with error if crew not found
      if (!crewLoading && !crew) {
        createAlert({
          type: 'GenericAlert',
          data: { content: 'Invalid Crew ID specified.' },
          level: 'warning',
          duration: 5000
        });
        history.replace('/');
      }

    // if i is not specified, but I am logged in...
    } else if (authenticated) {
      // ...if my crew is done loading...
      if (!myCrewLoading) {
        // ...if my crew exists, redirect to it
        if (myCrew?.id) {
          history.replace(`/crew/${myCrew.id}`);
        // ...if my crew does not exist, prompt to create a new crew
        } else {
          history.replace(`/recruit/0`);
        }
      }
    // if i is not specified and I am not logged in... return to / without warning
    } else {
      history.replace('/');
    }
  }, [authenticated, crewLoading, crew, i, myCrew, myCrewLoading]);

  const loading = myCrewLoading || crewLoading;
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
          isMyCrew={crewId === myCrew?.id}
          isOwnedCrew={Address.areEqual(crew?.Nft?.owner || '', accountAddress || '')}
          selectCrew={selectCrew}
        />
      )}
    </Details>
  );
};

export default Wrapper;
