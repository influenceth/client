import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWeb3React } from '@web3-react/core';
import styled, { css } from 'styled-components';
import { toCrewClass, toCrewTitle, toCrewCollection } from 'influence-utils';
import LoadingAnimation from 'react-spinners/PuffLoader';
import { MdFlag as SaleIcon, MdClose } from 'react-icons/md';
import { BsCheckCircle } from 'react-icons/bs';
import { AiFillEdit as NameIcon } from 'react-icons/ai';

import useCrewMember from '~/hooks/useCrewMember';
import useNameCrew from '~/hooks/useNameCrew';
import Details from '~/components/Details';
import Button from '~/components/Button';
import IconButton from '~/components/IconButton';
import DataReadout from '~/components/DataReadout';
import TextInput from '~/components/TextInput';
import LogEntry from '~/components/LogEntry';

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
`;

const AvatarImage = styled.img`
  display: ${p => p.visible ? 'block' : 'none'};
  object-fit: contain;
  object-position: 100% 100%;
  height: 100%;
  position: absolute;
  width: 100%;
`;

const Subtitle = styled.h2`
  border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
  font-size: 18px;
  height: 40px;
  line-height: 40px;
  margin: 10px 0 0 0;
`;

const Data = styled.div`
  display: flex;
  flex-direction: column;
  margin: 20px 10px 5px 15px;
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
  margin: 15px 20px 0 20px;

  & input {
    margin-right: 10px;
  }
`;

const StyledButton = styled(Button)`
  margin-top: 15px;
  width: 150px;
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

const CrewMemberDetails = (props) => {
  const { i } = useParams();
  const { data: crew } = useCrewMember(i);
  const nameCrew = useNameCrew(i);
  const { account } = useWeb3React();
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const [ naming, setNaming ] = useState(false);
  const [ newName, setNewName ] = useState('');
  const loadingCss = css`
    margin: auto;
  `;

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
              {!crew.name && account === crew.owner && (
                <StyledButton
                  onClick={() => setNaming(true)}>
                  <NameIcon />Set Name
                </StyledButton>
              )}
              {naming && (
                <NameForm>
                  <TextInput
                    pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                    initialValue=""
                    onChange={(v) => setNewName(v)} />
                  <IconButton
                    data-tip="Submit"
                    data-for="global"
                    onClick={() => {
                      nameCrew.mutate({ name: newName });
                      setNewName('');
                      setNaming(false);
                    }}>
                    <BsCheckCircle />
                  </IconButton>
                  <IconButton
                    data-tip="Cancel"
                    data-for="global"
                    onClick={() => setNaming(false)}>
                    <MdClose />
                  </IconButton>
                </NameForm>
              )}
              <StyledButton
                data-tip={account === crew.owner ? 'List on OpenSea' : 'Purchase on OpenSea'}
                data-for="global"
                onClick={() => goToOpenSeaCrew(crew.i)}>
                <SaleIcon />{account === crew.owner ? 'List for Sale' : 'Purcahse Crew'}
              </StyledButton>
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
              src={`${process.env.REACT_APP_API_URL}/v1/metadata/crew/${crew.i}/card.svg?bustOnly=true&width=900`} />
          </Avatar>
        </StyledCrewMemberDetails>
      )}
    </Details>
  );
};

export default CrewMemberDetails;
