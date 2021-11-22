import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { toCrewClass } from 'influence-utils';

import ListHoverItem from './ListHoverItem';
import IconButton from '~/components/IconButton';
import { CrewMemberIcon } from '~/components/Icons';

const ClassBadge = styled.span`
  color: ${p => p.theme.colors.classes[p.crewClass]};
`;

const CrewMemberItem = ({ crew, selected }) => {
  const history = useHistory();

  return (
    <ListHoverItem
      title={(
        <>
          {crew.name || `Crew Member #${crew.i}`}
          {' - '}
          {toCrewClass(crew.crewClass) || 'Unknown Class'}
          {<ClassBadge crewClass={toCrewClass(crew.crewClass)}> &#9679;</ClassBadge>}
        </>
      )}
      hoverContent={(
        <IconButton
          data-tip={'Crew Member Details'}
          onClick={() => history.push(`/crew/${crew.i}`)}>
          <CrewMemberIcon />
        </IconButton>
      )}
      selected={selected}
    />
  );
};

export default CrewMemberItem;
