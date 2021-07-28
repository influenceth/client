import styled from 'styled-components';
import { AiFillStar } from 'react-icons/ai';

import useUser from '~/hooks/useUser';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import Pane from './Pane';

const OwnedAsteroids = (props) => {
  const user = useUser();
  const asteroids = useOwnedAsteroids();

  return (
    <Pane title="Owned Asteroids" icon={<AiFillStar />}>
      <ul>
        {asteroids.data?.map(a => (
          <li key={a.i}>
            <span>{a.i}</span>
          </li>
        ))}
      </ul>
    </Pane>
  );
};

export default OwnedAsteroids;
