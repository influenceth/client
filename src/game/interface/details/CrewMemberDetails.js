import { useState } from 'react';
import { useParams } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { toCrewClass, toCrewTitle, toCrewCollection } from 'influence-utils';
import LoadingAnimation from 'react-spinners/PuffLoader';

import useCrewMember from '~/hooks/useCrewMember';
import Details from '~/components/Details';
import Button from '~/components/Button';
import DataReadout from '~/components/DataReadout';
import LogEntry from '~/components/LogEntry';

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
  border-bottom: 1px solid ${p => p.theme.colors.classes[p.crewClass]};
  border-right: 1px solid ${p => p.theme.colors.classes[p.crewClass]};
  bottom: 0;
  display: flex;
  height: calc(100% - 25px);
  position: absolute;
  right: 0;
  width: 50%;
`;

const AvatarImage = styled.img`
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
  padding-left: 15px;
`;

const Data = styled.div`
  display: flex;
  flex-direction: column;
  margin: 20px 10px 5px 15px;
`;

const GeneralData = styled(DataReadout)`
  margin: 5px 0;
`;

const Controls = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

const StyledButton = styled(Button)`
  margin: 15px 20px 0 20px;
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
  const [ imageLoaded, setImageLoaded ] = useState(false);
  const loadingCss = css`
    margin: auto;
  `;

  return (
    <Details
      title={!!crew ? `${crew.name || `Crew Member #${crew.i}`} - Details` : 'Crew Member Details'}>
      {crew && (
        <StyledCrewMemberDetails>
          <SidePanel>
            <Data>
              <GeneralData label="Class">{toCrewClass(crew.crewClass)}</GeneralData>
              <GeneralData label="Title">{toCrewTitle(crew.title)}</GeneralData>
              <GeneralData label="Collection">{toCrewCollection(crew.crewCollection)}</GeneralData>
            </Data>
            <Controls>
              <Subtitle>Manage Crew Member</Subtitle>
              <StyledButton>Set Name</StyledButton>
              <StyledButton>List for Sale</StyledButton>
            </Controls>
            <Log>
              <Subtitle>Crew Log</Subtitle>
              <ul>
                {crew.events.map(e => {
                  console.log(e);
                  return <LogEntry key={e.transactionHash} type={`CrewMember_${e.event}`} data={e} />
                })}
              </ul>
            </Log>
          </SidePanel>
          <Avatar crewClass={toCrewClass(crew.crewClass)}>
            <LoadingAnimation color={'white'} css={loadingCss} loading={!imageLoaded} />
            <AvatarImage
              onLoad={() => setImageLoaded(true)}
              src={`${process.env.REACT_APP_API_URL}/v1/metadata/crew/${crew.i}/card.svg?bustOnly=true&width=900`} />
          </Avatar>
        </StyledCrewMemberDetails>
      )}
    </Details>
  );
};

export default CrewMemberDetails;
