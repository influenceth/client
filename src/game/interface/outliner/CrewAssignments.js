import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { RiPagesFill as DetailIcon } from 'react-icons/ri';
import { ImRocket as CrewIcon } from 'react-icons/im';
import { BiTransfer as TradeIcon } from 'react-icons/bi';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import CrewMemberItem from '~/components/CrewMemberItem';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import ListEmptyMessage from '~/components/ListEmptyMessage';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const MissionList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: auto;
  padding: 0;
  scrollbar-width: thin;
`;

const CrewAssignments = (props) => {
  const history = useHistory();
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();

  return (
    <Section
      name="crewAssignments"
      title="Crew Assignments"
      icon={<CrewIcon />}>
      <Controls>
        <IconButton
          data-tip="Crew Assignment Details"
          onClick={() => history.push('/crew-assignments')}>
          <DetailIcon />
        </IconButton>
      </Controls>
      <MissionList>
        {crew?.length === 0 && mintable?.length === 0 && (
          <ListEmptyMessage><span>No owned crew</span></ListEmptyMessage>
        )}
        {crew?.length > 0 && crew.map(c => <CrewMemberItem key={c.i} crew={c} />)}
      </MissionList>
    </Section>
  );
};

export default CrewAssignments;
