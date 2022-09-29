import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { toCrewClass, toCrewCollection, toCrewTitle, toCrewTrait } from 'influence-utils';
import { FaBookOpen as BioIcon } from 'react-icons/fa';
import { RiBarChart2Fill as StatsIcon } from 'react-icons/ri';

import useAuth from '~/hooks/useAuth';
import useCrewAssignments from '~/hooks/useCrewAssignments';
import useCrewMember from '~/hooks/useCrewMember';
import useNameCrew from '~/hooks/useNameCrew';
import useStore from '~/hooks/useStore';
import Button from '~/components/Button';
import CrewCard from '~/components/CrewCard';
import DataReadout from '~/components/DataReadout';
import Details from '~/components/Details';
import Form from '~/components/Form';
import IconButton from '~/components/IconButton';
import {
  CheckCircleIcon,
  ClaimIcon,
  EditIcon,
  HexagonIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import LogEntry from '~/components/LogEntry';
import MarketplaceLink from '~/components/MarketplaceLink';
import TabContainer from '~/components/TabContainer';
import Text from '~/components/Text';
import TextInput from '~/components/TextInput';

import { unixTimeToGameTime } from '~/lib/utils';
import CrewTraitIcon from '~/components/CrewTraitIcon';

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

const CrewDetails = styled.div`
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
  flex: 0 0 330px;
  font-size: 15px;
  text-transform: uppercase;
  @media (min-height: 950px) {
    flex-basis: 45%;
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

const TraitPane = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  padding: 8px 0 0;
  width: 100%;
  @media (max-width: ${breakpoint}px) {
    flex-direction: column-reverse;
    padding: 0;
  }
`;
const traitSize = 128;
const AllTraits = styled.div`
  display: grid;
  flex: 2 0 ${(traitSize + 5) * 3}px;
  grid-template-columns: repeat(auto-fill, minmax(${traitSize}px, 1fr));
  grid-template-rows: ${traitSize}px;
  overflow: auto;
  scrollbar-width: thin;
  @media (max-width: ${breakpoint}px) {
    display: flex;
    flex: none;
    flex-direction: row;
  }
`;
const Trait = styled.div`
  align-items: center;
  ${p => p.selected && 'background: linear-gradient(to bottom, transparent 0%, rgb(255, 255, 255, 0.175) 100%);'}
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex: 1 0 ${traitSize}px;
  flex-direction: column;
  font-size: ${traitSize - 32 - 10}px;
  height: ${traitSize}px;
  justify-content: center;
  padding: 5px;
  line-height: ${0.74 * (traitSize - 32 - 10)}px;

  & > h6 {
    color: ${p => p.selected ? 'white' : p.theme.colors.secondaryText};
    font-size: 12px;
    line-height: 32px;
    margin: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    & > h6 {
      color: white;
    }
  }

  @media (max-width: ${breakpoint}px) {
    ${p => p.selected && 'background: linear-gradient(to top, transparent 0%, rgb(255, 255, 255, 0.175) 100%);'}
    border-top: 1px solid ${borderColor};
  }
`;

const TraitSelected = styled.div`
  align-items: center;
  display: flex;
  flex: 1 0 225px;
  flex-direction: column;
  padding-left: 10px;
`;

const NoTraitsMessage = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px;
  width: 100%;
  & > div {
    opacity: 0.5;
  }
  & > div:first-child {
    font-size: 80px;
  }
  & > div:nth-child(2) {
    font-size: 14px;
    line-height: 32px;
  }
  & > button {
    font-size: 85%;
    font-weight: bold;
    margin-top: 24px;
    padding-left: 40px;
    padding-right: 40px;
    opacity: 1;
    text-transform: uppercase;
    white-space: nowrap;
    width: auto;
  }
  
  @media (max-width: ${breakpoint}px) {
    border-bottom: 2px solid #18313a;
  }
`;

const Display = styled.div`
  align-items: center;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: 175px;
  overflow: hidden;
  padding: 0 0 10px;
  & > div {
    font-size: 100px;
    line-height: 74px;
  }
  & > h6 {
    font-size: 16px;
    margin: 0;
  }
  @media (max-width: ${breakpoint}px) {
    min-height: 0;
    padding-top: 20px;
  }
`;
const Description = styled.div`
  align-items: center;
  border-bottom: 1px solid ${borderColor};
  border-top: 1px solid ${borderColor};
  color: ${p => p.theme.colors.mainText};
  display: flex;
  font-size: 12px;
  height: 85px;
  justify-content: center;
  padding: 5px;
  text-align: center;
  width: 100%;
  & > div {
    max-height: 75px;
    max-width: 500px;
    overflow: auto;
    padding: 1px 0;
  }
  @media (max-width: ${breakpoint}px) {
    border: none;
  }
`;

const NameForm = styled.div`
  display: flex;
  margin-top: 15px;
  max-width: 100%;

  & input {
    margin-right: 10px;
    min-width: 0;
  }
  & button {
    margin-right: 0;
  }
`;

const History = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: 25px;
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

const MIN_TRAIT_SLOTS = 12;

const CrewMemberDetails = (props) => {
  const { i } = useParams();
  const history = useHistory();
  const { account } = useAuth();
  const { data: assignmentData } = useCrewAssignments();
  const { data: crew } = useCrewMember(i);
  const { nameCrew, naming } = useNameCrew(Number(i));
  const playSound = useStore(s => s.dispatchSoundRequested);

  const [ newName, setNewName ] = useState('');
  const [ selectedTrait, setSelectedTrait ] = useState();

  const startDate = useMemo(() => {
    if (crew?.events?.length > 0) {
      return unixTimeToGameTime(crew.events[0].timestamp);
    }
    return null;
  }, [crew?.events]);

  const goToCrewAssignments = useCallback(() => {
    if (assignmentData?.assignmentsByBook?.length > 0) {
      history.push(`/crew-assignments/${assignmentData.assignmentsByBook[0].id}`);
    }
  }, [assignmentData?.assignmentsByBook, history]);

  const selectTrait = useCallback((trait, mute) => () => {
    setSelectedTrait({
      ...(toCrewTrait(trait) || {}),
      id: trait
    });
    if (!mute) {
      playSound('effects.click');
    }
  }, [playSound]);

  const fillerTraits = useMemo(() => {
    if (crew?.traits.length > 0 && crew?.traits.length < MIN_TRAIT_SLOTS) {
      return Array.from(Array(MIN_TRAIT_SLOTS - crew.traits.length));
    }
    return [];
  }, [crew?.traits]);

  useEffect(() => {
    if(crew?.traits?.length > 0) {
      selectTrait(crew.traits[0], true)();
    }
  }, [crew?.traits, selectTrait]);

  return (
    <Details
      contentProps={{ style: { margin: 0 } }}
      title="Crewmate Profile">
      {crew && (
        <Content>
          <CrewBasics>
            <CardWrapper>
              <CrewCard crew={crew} />
            </CardWrapper>
            <BelowCardWrapper>
              <CrewLabels>
                {startDate && (
                  <DataReadout label="Career Start" slim inheritFontSize style={{ margin: '1.4em 0' }}>
                    {startDate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SA
                  </DataReadout>
                )}
                <DataReadout label="Class" slim inheritFontSize>{toCrewClass(crew.crewClass)}</DataReadout>
                <DataReadout label="Title" slim inheritFontSize>{crew.title > 0 ? toCrewTitle(crew.title) : '(n/a)'}</DataReadout>
                <DataReadout label="Collection" slim inheritFontSize>{toCrewCollection(crew.crewCollection)}</DataReadout>
              </CrewLabels>
              <Management>
                <ManagementSubtitle>Management</ManagementSubtitle>
                {!crew.name && (
                  <Form
                    title={<><EditIcon /><span>Set Name</span></>}
                    data-tip="Name crew member"
                    data-for="global"
                    loading={naming}>
                    <Text>
                      A crew member can only be named once!
                      Names must be unique, and can only include letters, numbers, and single spaces.
                    </Text>
                    <NameForm>
                      <TextInput
                        pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                        initialValue=""
                        disabled={naming}
                        resetOnChange={i}
                        onChange={(v) => setNewName(v)} />
                      <IconButton
                        data-tip="Submit"
                        data-for="global"
                        disabled={naming}
                        onClick={() => nameCrew(newName)}>
                        <CheckCircleIcon />
                      </IconButton>
                    </NameForm>
                  </Form>
                )}

                <MarketplaceLink
                  chain={crew?.chain}
                  assetType="crewmate"
                  id={crew?.i}>
                  {(onClick, setRefEl) => (
                    <Button
                      disabled={parseInt(crew?.activeSlot) > -1}
                      setRef={setRefEl}
                      onClick={onClick}>
                      <ClaimIcon /> {account === crew.owner ? 'List for Sale' : 'Purchase Crew'}
                    </Button>  
                  )}
                </MarketplaceLink>

              </Management>
            </BelowCardWrapper>
          </CrewBasics>
          <CrewDetails>
            <TabContainer
              containerCss={tabContainerCss}
              iconCss={{}}
              labelCss={{ minWidth: '50px', textAlign: 'center' }}
              tabCss={{ width: '116px' }}
              tabs={[
                {
                  icon: <HexagonIcon />,
                  label: 'Traits',
                },
                {
                  icon: <BioIcon />,
                  label: 'Bio',
                  disabled: true
                },
                {
                  icon: <StatsIcon />,
                  label: 'Stats',
                  disabled: true,
                }
              ]}
              panes={[
                (
                  <TraitPane>
                    {crew?.traits?.length > 0 && (
                      <>
                        <AllTraits>
                          {crew.traits.map((trait) => {
                            const { name, type } = toCrewTrait(trait) || {};
                            if (name) {
                              return (
                                <Trait
                                  key={trait}
                                  onClick={selectTrait(trait)}
                                  selected={selectedTrait?.id === trait}>
                                  <CrewTraitIcon trait={trait} type={type} />
                                  <h6>{name}</h6>
                                </Trait>
                              );
                            }
                            return null;
                          })}
                          {fillerTraits.map((tmp, i) => (
                            <Trait key={i} style={{ opacity: 0.10 }}>
                              <HexagonIcon />
                              <h6>&nbsp;</h6>
                            </Trait>
                          ))}
                        </AllTraits>
                        <TraitSelected>
                          <Display>
                            <div>
                              <CrewTraitIcon trait={selectedTrait?.id} type={selectedTrait?.type} />
                            </div>
                            <h6>{selectedTrait?.name}</h6>
                          </Display>
                          {selectedTrait?.description && (
                            <Description>
                              <div>
                                {selectedTrait?.description}
                              </div>
                            </Description>
                          )}
                        </TraitSelected>
                      </>
                    )}
                    {!crew?.traits?.length && (
                      <NoTraitsMessage>
                        <div>
                          <WarningOutlineIcon />
                        </div>
                        <div>
                          This crewmate doesn't have any traits.
                        </div>
                        {assignmentData?.assignmentsByBook?.length > 0 && (
                          <Button onClick={goToCrewAssignments}>
                            Go to Crew Assignments
                          </Button>
                        )}
                      </NoTraitsMessage>
                    )}
                  </TraitPane>
                ),
                null,
                null
              ]}
              negativeTopMargin
            />
            <History>
              <Subtitle>Crew Log</Subtitle>
              <Log>
                <LogHeader>
                  <LogEntry isHeaderRow isTabular />
                </LogHeader>
                <div>
                  <ul>
                    {crew?.events?.length > 0
                      ? crew.events.map(e => (
                        <LogEntry
                          key={`${e.transactionHash}_${e.logIndex}`}
                          data={{ ...e, i: crew.i }}
                          type={`CrewMember_${e.event}`}
                          isTabular />
                      ))
                      : <EmptyLogEntry>No logs recorded yet.</EmptyLogEntry>
                    }
                  </ul>
                </div>
              </Log>
            </History>
          </CrewDetails>
        </Content>
      )}
    </Details>
  );
};

export default CrewMemberDetails;
