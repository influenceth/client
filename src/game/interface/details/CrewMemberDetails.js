import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import styled, { css } from 'styled-components';
import { toCrewClass, toCrewTitle, toCrewCollection } from 'influence-utils';
import LoadingAnimation from 'react-spinners/PuffLoader';

import useCrewMember from '~/hooks/useCrewMember';
import useNameCrew from '~/hooks/useNameCrew';
import Details from '~/components/Details';
import Form from '~/components/Form';
import Text from '~/components/Text';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import TextInput from '~/components/TextInput';
import LogEntry from '~/components/LogEntry';
import { EditIcon, CheckCircleIcon, ClaimIcon } from '~/components/Icons';

const goToOpenSeaCrew = (i) => {
  const url = `${process.env.REACT_APP_OPEN_SEA_URL}/assets/${process.env.REACT_APP_CONTRACT_CREW_TOKEN}/${i}`;
  window.open(url, '_blank');
};

const StyledCrewMemberDetails = styled.div`
  height: 100%;
`;

const SidePanel = styled.div`
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  width: 325px;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 15px;
    width: 100%;
  }
`;

const Avatar = styled.div`
  align-items: center;
  background-image: linear-gradient(
    300deg,
    ${p => p.theme.colors.classes[p.crewClass]}AA,
    ${p => p.theme.colors.classes[p.crewClass]}00 40%
  );
  border-bottom: 1px solid ${p => p.theme.colors.main};
  border-right: 1px solid ${p => p.theme.colors.main};
  bottom: 0;
  display: flex;
  height: calc(100% - 25px);
  position: absolute;
  right: 0;
  width: 50%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    background-image: linear-gradient(
      340deg,
      ${p => p.theme.colors.classes[p.crewClass]}AA,
      ${p => p.theme.colors.classes[p.crewClass]}00 40%
    );
    border: 0;
    height: auto;
    position: relative;
    width: 100%;
  }
`;

const AvatarImage = styled.img`
  display: ${p => p.visible ? 'block' : 'none'};
  object-fit: contain;
  object-position: 100% 100%;
  height: 100%;
  position: absolute;
  width: 100%;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    position: relative;
  }
`;

const Subtitle = styled.h2`
  border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
  font-size: 18px;
  height: 40px;
  line-height: 40px;
  margin: 10px 0 0 0;
`;

const GeneralData = styled(DataReadout)`
  margin: 5px 0;
`;

const Pane = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0 0 20px 15px;
`;

const NameForm = styled.div`
  display: flex;
  margin-top: 15px;

  & input {
    margin-right: 10px;
  }
`;

const Log = styled.div`
  flex: 0 1 33%;

  & ul {
    display: flex;
    flex-direction: column-reverse;
    list-style-type: none;
    margin: 10px 0 0 5px;
    overflow-y: hidden;
    padding: 0;
  }
`;

const loadingCss = css`
  margin: auto;
`;

const CrewMemberDetails = (props) => {
  const { i } = useParams();
  const { data: crew } = useCrewMember(Number(i));
  const { nameCrew, naming } = useNameCrew(Number(i));
  const { account } = useWeb3React();
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const [ newName, setNewName ] = useState('');

  return (
    <Details
      title={!!crew ? `${crew.name || `Crew Member #${crew.i}`} - Details` : 'Crew Member Details'}>
      {crew && (
        <StyledCrewMemberDetails>
          <SidePanel>
            <Pane>
              <Subtitle>Crew Member Info</Subtitle>
              <GeneralData label="Class">{toCrewClass(crew.crewClass) || 'Unknown Class'}</GeneralData>
              <GeneralData label="Title">{toCrewTitle(crew.title) || 'Unknown Title'}</GeneralData>
              <GeneralData label="Collection">{toCrewCollection(crew.crewCollection) || 'Arvad Citizen'}</GeneralData>
            </Pane>
            <Pane>
              <Subtitle>Manage Crew Member</Subtitle>
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
              <Button
                data-tip={account === crew.owner ? 'List on OpenSea' : 'Purchase on OpenSea'}
                data-for="global"
                onClick={() => goToOpenSeaCrew(crew.i)}>
                <ClaimIcon />{account === crew.owner ? 'List for Sale' : 'Purchase Crew'}
              </Button>
            </Pane>
            <Pane>
              <Subtitle>Crew Log</Subtitle>
              <Log>
                <ul>
                  {crew.events.map(e => <LogEntry key={e.transactionHash} type={`CrewMember_${e.event}`} data={e} />)}
                </ul>
              </Log>
            </Pane>
          </SidePanel>
          <Avatar crewClass={toCrewClass(crew.crewClass)}>
            <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
            <AvatarImage
              onLoad={() => setImageLoaded(true)}
              visible={imageLoaded}
              src={`${process.env.REACT_APP_IMAGES_URL}/v1/crew/${crew.i}/image.svg?bustOnly=true&width=900`} />
          </Avatar>
        </StyledCrewMemberDetails>
      )}
    </Details>
  );
};

export default CrewMemberDetails;
