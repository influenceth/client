import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import EntityName from './EntityName';

const EntityLink = (props) => {
  const { id, label } = props;

  const link = useMemo(() => {
    switch (label) {
      case Entity.IDS.ASTEROID: return `/asteroids/${id}`;
      case Entity.IDS.BUILDING: return `/building/${id}`;  // TODO: ...
      case Entity.IDS.CREW: return `/crew/${id}`;
      case Entity.IDS.CREWMATE: return `/crewmate/${id}`;
      case Entity.IDS.SHIP: return `/ship/${id}`; // TODO: ...
    }
  }, [label, id]);

  return <Link to={link}><EntityName {...props} /></Link>;
};

export default EntityLink;
