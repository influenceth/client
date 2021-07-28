import styled from 'styled-components';
import { AiFillStar } from 'react-icons/ai';

import useUser from '~/hooks/useUser';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import Section from './Section';

const OwnedAsteroids = (props) => {
  const user = useUser();
  const asteroids = useOwnedAsteroids();

  return (
    <Section title="Owned Asteroids" icon={<AiFillStar />}>
      <ul>
        {asteroids.data?.map(a => (
          <li key={a.i}>
            <span>{a.i}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default OwnedAsteroids;
