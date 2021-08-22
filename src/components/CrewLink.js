import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import useOwnedCrew from '~/hooks/useOwnedCrew';

const CrewLink = (props) => {
  const { id, name: initialName } = props;
  const { data: owned } = useOwnedCrew();
  const [ name, setName ] = useState(initialName);

  useEffect(() => {
    if (owned) {
      const match = owned.find(a => a.i === Number(id));
      if (match) setName(match.name || `#${id}`);
    } else {
      setName(initialName || `#${id}`);
    }
  }, [ owned, id, initialName ]);

  return <Link to={`/crew/${id}`}>{name}</Link>;
};

export default CrewLink;
