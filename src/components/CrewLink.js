import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useCrewContext from '~/hooks/useCrewContext';

const CrewLink = (props) => {
  const { id, name: initialName } = props;
  const { crewmateMap } = useCrewContext();
  const [ name, setName ] = useState(initialName);

  useEffect(() => {
    if (crewmateMap) {
      const match = crewmateMap[id];
      if (match) setName(match.name || `#${id}`);
    } else {
      setName(initialName || `#${id}`);
    }
  }, [ crewmateMap, id, initialName ]);

  return <Link to={`/crew/${id}`}>{name}</Link>;
};

export default CrewLink;
