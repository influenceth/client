import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Address, Building, Crewmate, Entity, Name, Time } from '@influenceth/sdk';
import { FaBookOpen as BioIcon } from 'react-icons/fa';
import { RiBarChart2Fill as StatsIcon } from 'react-icons/ri';
import LoadingAnimation from 'react-spinners/PuffLoader';

import CoverImageSrc from '~/assets/images/modal_headers/OwnedCrew.png';
import Button from '~/components/ButtonAlt';
import CrewCard from '~/components/CrewCard';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import DataReadout from '~/components/DataReadout';
import Details from '~/components/DetailsModal';
import Form from '~/components/Form';
import IconButton from '~/components/IconButton';
import {
  CheckCircleIcon,
  CheckIcon,
  ClaimIcon,
  CloseIcon,
  EditIcon,
  FoodIcon,
  HexagonIcon,
  LocationIcon,
  MyAssetIcon,
  PlusIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import LogEntry from '~/components/LogEntry';
import MarketplaceLink from '~/components/MarketplaceLink';
import TabContainer from '~/components/TabContainer';
import Text from '~/components/Text';
import useAuth from '~/hooks/useAuth';
// import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrewmate from '~/hooks/useCrewmate';
import useCrewLocation from '~/hooks/useCrewLocation';
import useNameAvailability from '~/hooks/useNameAvailability';
import useChangeName from '~/hooks/useChangeName';
import useStore from '~/hooks/useStore';
import { boolAttr } from '~/lib/utils';
import useCrewContext from '~/hooks/useCrewContext';
import ChoicesDialog from '~/components/ChoicesDialog';
import { getCloudfrontUrl } from '~/lib/assetUtils';
import SelectHabitatDialog from '~/components/SelectHabitatDialog';
import SelectUninitializedCrewmateDialog from '~/components/SelectUninitializedCrewmateDialog';
import TextInput from '~/components/TextInput';
import formatters from '~/lib/formatters';
import useCrew from '~/hooks/useCrew';
import CrewCardFramed from '~/components/CrewCardFramed';
import useCrewmates from '~/hooks/useCrewmates';
import theme from '~/theme';
import useAsteroid from '~/hooks/useAsteroid';
import useBuilding from '~/hooks/useBuilding';
import useShip from '~/hooks/useShip';
import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';

const borderColor = 'rgba(200, 200, 200, 0.15)';
const breakpoint = 1375;

const Content = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding: 40px 35px 25px;
  @media (max-width: ${breakpoint}px) {
    flex-direction: column;
    height: auto;
    padding: 10px 0 0px;
  }
`;

const Subtitle = styled.h5`
  border-bottom: 1px solid ${borderColor};
  font-size: 14px;
  line-height: 32px;
  margin: 10px 0 0 0;
`;

const ManagementSubtitle = styled(Subtitle)`
  @media (max-width: ${breakpoint}px) {
    display: none;
  }
`;

const CrewBasics = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  overflow: hidden;

  @media (max-width: ${breakpoint}px) {
    flex-direction: row;
    flex-wrap: wrap;
    height: auto;
    overflow: visible;
    margin-bottom: 25px;
    padding: 0 15px;
  }
`;

const CardWrapper = styled.div`
  border: 1px solid #363636;
  padding: 2px;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: 0 1 400px;
    @media (min-width: 440px) {
      margin: 0 10px 0 0;
    }
  }
  @media (min-width: ${p => p.theme.breakpoints.mobile}px) and (max-width: ${breakpoint}px) {
    flex: 0 1 350px;
    margin: 0 10px 0 0;
  }
`;

const BelowCardWrapper = styled.div`
  margin-top: 5px;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 3px;
  flex: 1;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    flex: none;
    max-width: 100%;
    overflow-y: visible;
    overflow-x: visible;
  }
`;

const CrewmateDetails = styled.div`
  display: flex;  
  flex: 3;
  flex-direction: column;
  height: 100%;
  padding-left: 25px;
  @media (max-width: ${breakpoint}px) {
    display: block;
    padding-left: 0;
  }
`;

const CrewLabels = styled.div`
  color: white;
  font-size: 85%;
  line-height: 1.4em;
  margin-top: -5px;
  & label {
    color: #666666;
  }
`;

const Management = styled.div`
  padding-top: 15px;
`;

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
    flex-direction: column-reverse;
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
    overflow-x: hidden;
    overflow-y: auto;
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
  justify-content: flex-start;
  margin-top: 60px;
  padding: 25px 35px;
  position: relative;
  z-index: 1;
`;

const AboveFold = styled.div`
  align-items: stretch;
  display: flex;
  flex-direction: row;
  min-height: 300px;
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

const Food = styled.div`
  align-items: center;
  color: ${p => p.isRationing ? p.theme.colors.red : p.theme.colors.green};
  display: flex;
  span {
    font-size: 15px;
    margin: 0 6px;
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

const EmptySlot = styled.div`
  border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.4);
  background: black;
  cursor: ${p => p.theme.cursors.active};
  padding: 8px 6.5px;
  position: relative;
  width: ${p => p.width}px;
  transition: background 250ms ease, border-color 250ms ease;
  &:before {
    content: "";
    background: rgba(${p => p.theme.colors.mainRGB}, 0.13);
    display: block;
    height: 0;
    padding-top: 137.5%;
    width: 100%;
  }
  & > svg {
    color: ${p => p.theme.colors.main};
    opacity: 0.5;
    position: absolute;
    top: calc(50% - 35px);
    left: calc(50% - 35px);
    font-size: 70px;
    line-height: 70px;
    transition: opacity 250ms ease;
  }

  &:hover {
    background: #183541;
    border-color: ${p => p.theme.colors.main};
    & > svg { opacity: 0.75; }
  }
`;

const BelowFold = styled.div``;

// TODO: this should be in sdk
Name.getTypeRegex = (entityType) => {
  if (!Name.TYPES[entityType]) return null;

  const { min, max, alpha, num, sym } = Name.TYPES[entityType];
  let regexPart;
  if (sym) {
    if (alpha && num) regexPart = `[^\\s]`;
    else if (alpha && !num) regexPart = `[^0-9\\s]`;
    else if (!alpha && num) regexPart = `[^a-zA-Z\\s]`;
    else if (!alpha && !num) regexPart = `[^a-zA-Z0-9\\s]`;
  } else {
    regexPart = `[${alpha ? 'a-zA-Z' : ''}${num ? '0-9' : ''}]`;
  }

  return `^(?=.{${min},${max}}$)(${regexPart}+\\s)*${regexPart}+$`;
};

const CrewDetails = ({ crewId, crew, crewLocation, crewmates, isMyCrew }) => {
  const history = useHistory();

  const createAlert = useStore(s => s.dispatchAlertLogged);
  const isNameValid = useNameAvailability(Entity.IDS.CREW);
  const { changeName, changingName } = useChangeName({ id: crewId, label: Entity.IDS.CREW });

  // TODO: should we combine these into a single location link?
  const onLotLink = useLotLink(crewLocation || {});
  const onShipLink = useShipLink(crewLocation || {});

  // TODO: _location is probably not populated if not my own crew...?
  const { data: crewAsteroid } = useAsteroid(crewLocation?.asteroidId);
  const { data: crewBuilding } = useBuilding(crewLocation?.buildingId);
  const { data: crewShip } = useShip(crewLocation?.shipId);

  const [editing, setEditing] = useState();
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

  const goToCrewLocation = useCallback(() => {
    if (crewLocation?.shipId && !crewLocation?.lotId) onShipLink();
    else onLotLink();
    history.push('/');
  }, [crewLocation, onLotLink, onShipLink]);

  const onClickCrewmate = useCallback((crewmate) => () => {
    history.push(`/crewmate/${crewmate.id}`);
  }, []);

  const onClickRecruit = useCallback(() => {
    if (false && crewBuilding?.Building?.buildingType === Building.IDS.HABITAT) {
      history.push(`/recruit/${crew.id}/${crewLocation.buildingId}`);
    } else {
      createAlert({
        type: 'GenericAlert',
        content: 'Your crew must be stationed in a habitat to recruit new members.',
        level: 'warning',
        duration: 6000
      })
    }
  }, [crew, crewBuilding]);

  const onClickNewCrew = useCallback(() => {
    history.push(`/recruit/0`);
  }, []);

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
              <CrewCardFramed
                borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                crewCardProps={{ hideHeader: false, noWrapName: true }}
                crewmate={crewmates[0]}
                isCaptain
                onClick={onClickCrewmate(crewmates[0])}
                width={180} />

              <CrewInfoContainer>
                <Crewmates>
                  {Array.from(Array(4)).map((_, i) => {
                    const crewmate = crewmates[i + 1];
                    if (!crewmate) {
                      return (
                        <EmptySlot onClick={onClickRecruit} width={146}>
                          <PlusIcon />
                        </EmptySlot>
                      );
                    }
                    return (
                      <CrewCardFramed
                        key={i}
                        borderColor={`rgba(${theme.colors.mainRGB}, 0.4)`}
                        crewCardProps={{ hideHeader: false, noWrapName: true }}
                        crewmate={crewmate}
                        onClick={onClickCrewmate(crewmate)}
                        width={146}
                        noArrow />
                    );
                  })}
                </Crewmates>

                <TitleBar>
                  <BaseLocation onClick={goToCrewLocation}>
                    <LocationIcon />{/* TODO: should be different icon */}
                    {crewAsteroid && <>{formatters.asteroidName(crewAsteroid)}</>}
                    {crewShip && <span>{formatters.shipName(crewShip)}</span>}
                    {!crewShip && crewBuilding && <span>{formatters.buildingName(crewBuilding)}</span>}
                    {!crewShip && !crewBuilding && crewLocation?.lotId && <span>Lot {crewLocation.lotId.toLocaleString()}</span>}
                  </BaseLocation>

                  {/* TODO: potentially link directly to add rations dialog instead */}
                  {/* TODO: implement lastFed or whatever */}
                  <Food isRationing={false} onClick={() => {/* TODO */}}>
                    {false && <WarningOutlineIcon />}
                    <span>100%</span>
                    <FoodIcon />
                  </Food>
                </TitleBar>

                {isMyCrew && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
                    <Button subtle style={{ width: 225 }}>Add Rations</Button>
                  </div>
                )}
              </CrewInfoContainer>

            </CrewWrapper>

            
          </CrewDetailsContainer>
          <ManagementContainer>
            {isMyCrew && <MyCrewStatement><MyAssetIcon /> This crew is owned by me.</MyCrewStatement>}
            <Stat label="No. Members">{crew.Crew?.roster?.length || 0}</Stat>
            <Stat label="Formed">TODO</Stat>
            {isMyCrew && (
              <div style={{ paddingTop: 15 }}>
                <Button subtle>Manage Crew</Button>
                <Button subtle onClick={onClickNewCrew}>Form New Crew</Button>
                <Button subtle onClick={onClickRecruit}>Recruit Crewmate</Button>
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
            panes={[
              (
                <History>
                  <Log>
                    <LogHeader>
                      <LogEntry isHeaderRow isTabular />
                    </LogHeader>
                    <div>
                      <ul>
                        {crew?.events?.length > 0
                          ? crew.events.map(e => (
                            <LogEntry
                              key={e.key}
                              data={{ ...e, id: crew.id }}
                              timestampBreakpoint="1500px"
                              type={`Crew_${e.event}`}
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
  const { crew: myCrew, loading: myCrewLoading } = useCrewContext();
  const history = useHistory();

  const crewId = Number(i || myCrew?.id);
  const { data: crew, isLoading: crewLoading } = useCrew(crewId);
  const { data: crewmates, isLoading: crewmatesLoading } = useCrewmates(crew?.Crew?.roster || []);
  const { data: crewLocation, isLoading: crewLocationLoading } = useCrewLocation(crewId);

  useEffect(() => {
    if (!i && !myCrewLoading && !myCrew) {

    }
  }, []);

  useEffect(() => {
    if (!crewLoading && !crew) {
      history.push('/');
    } else if (!i && myCrew?.id) {
      history.replace(`/crew/${myCrew.id}`);
    }
  }, [crewLoading, crew, myCrew])

  const loading = myCrewLoading || crewLoading || crewmatesLoading || crewLocationLoading;
  if (!myCrewLoading)
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
          crewLocation={crewLocation}
          crewmates={crewmates}
          isMyCrew={crewId === myCrew?.id}
        />
      )}
    </Details>
  );
};

export default Wrapper;
