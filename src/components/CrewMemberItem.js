import { useHistory } from 'react-router-dom';
import { Crewmate } from '@influenceth/sdk';

import ListHoverItem from './ListHoverItem';
import CrewClassIcon from '~/components/CrewClassIcon';
import IconButton from '~/components/IconButton';
import { CrewMemberIcon } from '~/components/Icons';

const CrewMemberItem = ({ crew, selected }) => {
  const history = useHistory();

  return (
    <ListHoverItem
      title={(
        <>
          {crew.name || `Crew Member #${crew.i}`}
          {' - '}
          {Crewmate.getClass(crew.crewClass)?.name || 'Unknown Class'}
          {' '}
          <CrewClassIcon crewClass={crew.crewClass} />
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
