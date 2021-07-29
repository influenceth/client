import styled from 'styled-components';
import { AiFillStar } from 'react-icons/ai';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { RiFilter2Fill } from 'react-icons/ri';

import useUser from '~/hooks/useUser';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import IconButton from '~/components/IconButton';
import Section from './Section';
import AsteroidItem from './AsteroidItem';

const AsteroidList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
`;

const Controls = styled.div`
padding-bottom: 25px;
`;

const OwnedAsteroids = (props) => {
  const user = useUser();
  const asteroids = useOwnedAsteroids();

  return (
    <Section title="Owned Asteroids" icon={<AiFillStar />}>
      <Controls>
        <IconButton data-tip="Show on Map"><FaMapMarkedAlt /></IconButton>
        <IconButton data-tip="Apply Filters"><RiFilter2Fill /></IconButton>
      </Controls>
      <AsteroidList>
        {asteroids.data?.map(a => <AsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default OwnedAsteroids;
