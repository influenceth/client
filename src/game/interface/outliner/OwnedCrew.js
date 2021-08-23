import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { RiPagesFill as DetailIcon } from 'react-icons/ri';
import { HiUserGroup as CrewIcon } from 'react-icons/hi';
import { BiTransfer as TradeIcon } from 'react-icons/bi';
import { toCrewClass } from 'influence-utils';

import useOwnedCrew from '~/hooks/useOwnedCrew';
import useMintableCrew from '~/hooks/useMintableCrew';
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
  align-items: stretch;
  display: flex;
  padding-left: 10px;
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    max-height: 120px;
  }
`;

const Description = styled.span`
  height: 40px;
  line-height: 40px;
`;

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
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
        <IconButton
          data-tip="Trade Crew Members"
          onClick={() => window.open(`${process.env.REACT_APP_OPEN_SEA_URL}/collection/influenceth-crew`)}>
          <TradeIcon />
        </IconButton>
      </Controls>
      <CrewList>
        {crew?.length === 0 && mintable?.length === 0 && <li><span>No owned crew</span></li>}
        {crew?.length === 0 && mintable?.length > 0 && (
          <StyledCrewItem>
            <span>No owned crew. {mintable.length} crew members available to be minted.</span>
          </StyledCrewItem>
        )}
        {crew?.length > 0 && crew.map(c => (
          <StyledCrewItem key={c.i}>
            <Description>
              {c.name || `Crew Member #${c.i}`}
              <span> - </span>
              {toCrewClass(c.crewClass) || 'Unknown Class'}
              {<ClassBadge crewClass={toCrewClass(c.crewClass)}> &#9679;</ClassBadge>}
            </Description>
          </StyledCrewItem>
        ))}
      </CrewList>
    </Section>
  );
};

export default OwnedCrew;
