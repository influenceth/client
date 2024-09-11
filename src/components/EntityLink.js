import { useMemo } from '~/lib/react-debug';
import { Link } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import EntityName from './EntityName';

const EntityLink = (props) => {
  const { id, label } = props;

  const link = useMemo(import.meta.url, () => {
    switch (label) {
      case Entity.IDS.ASTEROID: return `/asteroids/${id}`;
      case Entity.IDS.BUILDING: return `/building/${id}`;
      case Entity.IDS.CREW: return `/crew/${id}`;
      case Entity.IDS.CREWMATE: return `/crewmate/${id}`;
      case Entity.IDS.LOT: return `/lot/${id}`;
      case Entity.IDS.SHIP: return `/ship/${id}`;
      default: return '#';
    }
  }, [label, id]);

  return <Link to={link}><EntityName {...props} /></Link>;
};

export default EntityLink;
