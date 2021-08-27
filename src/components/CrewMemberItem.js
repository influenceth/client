import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { toCrewClass } from 'influence-utils';

import IconButton from '~/components/IconButton';
import { CrewMemberIcon } from '~/components/Icons';

const Description = styled.span`
  height: 40px;
  line-height: 40px;
`;

const StyledCrewMemberItem = styled.li`
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  max-height: 40px;
  overflow: hidden;
  padding-left: 10px;
  transition: all 0.3s ease;

  &:first-child:hover {
    border-top: 0;
  }

  &:hover {
    background-color: ${p => p.theme.colors.contentHighlight};
    border-top: 1px solid ${p => p.theme.colors.contentBorder};
    border-bottom: 1px solid ${p => p.theme.colors.contentBorder};
    max-height: 120px;
  }

  & ${Description} {
    color: ${p => p.selected ? p.theme.colors.main : 'inherit'};
  }
`;

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
`;

const Controls = styled.div`
  height: 40px;
`;

const CrewMemberItem = (props) => {
  const { crew, ...restProps } = props;
  const history = useHistory();

  return (
    <StyledCrewMemberItem {...restProps}>
      <Description>
        {crew.name || `Crew Member #${crew.i}`}
        <span> - </span>
        {toCrewClass(crew.crewClass) || 'Unknown Class'}
        {<ClassBadge crewClass={toCrewClass(crew.crewClass)}> &#9679;</ClassBadge>}
      </Description>
      <Controls>
        <IconButton
          data-tip={'Crew Member Details'}
          onClick={() => history.push(`/crew/${crew.i}`)}>
          <CrewMemberIcon />
        </IconButton>
      </Controls>
    </StyledCrewMemberItem>
  );
};

export default CrewMemberItem;
