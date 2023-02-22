import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useCrewContext from '~/hooks/useCrewContext';

const CrewLink = (props) => {
  const { id, name: initialName } = props;
  const { crewMemberMap } = useCrewContext();
  const [ name, setName ] = useState(initialName);

  useEffect(() => {
    if (crewMemberMap) {
      const match = crewMemberMap[id];
      if (match) setName(match.name || `#${id}`);
    } else {
      setName(initialName || `#${id}`);
    }
  }, [ crewMemberMap, id, initialName ]);

  return <Link to={`/crew/${id}`}>{name}</Link>;
};

export default CrewLink;
