import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { RiPagesFill as DetailIcon } from 'react-icons/ri';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';

const Controls = styled.div`
  display: flex;
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const CrewList = styled.ul`
  border-top: 1px solid ${p => p.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0;
`;

const StyledCrewItem = styled.li`
  padding: 10px 0;
`;

const OwnedCrew = (props) => {
  const history = useHistory();
  const { data: crew } = useOwnedCrew();
  const { data: mintable } = useMintableCrew();

  return (
    <Section
      name="ownedCrew"
      title="Owned Crew"
      icon={<CrewIcon />}>
      <Controls>
        <IconButton
          data-tip="Crew Details"
          onClick={() => history.push('/owned-crew')}>
          <DetailIcon />
        </IconButton>
      </Controls>
      <CrewList>
        {crew?.length === 0 && mintable?.length === 0 && <li><span>No owned crew</span></li>}
        {crew?.length === 0 && mintable?.length > 0 && (
          <StyledCrewItem>
            <span>No owned crew. {mintable.length} crew members available to be minted.</span>
          </StyledCrewItem>
        )}
      </CrewList>
    </Section>
  );
};

export default OwnedCrew;
