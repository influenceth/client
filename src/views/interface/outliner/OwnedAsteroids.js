import styled from 'styled-components';
import { AiFillStar } from 'react-icons/ai';
import { RiEyeFill, RiEyeOffFill, RiFilter2Fill } from 'react-icons/ri';

import useUser from '~/hooks/useUser';
import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useAsteroidsStore from '~/hooks/useAsteroidsStore';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 25px;
`;

const AsteroidList = styled.ul`
  border-top: 1px solid #666;
  flex: 0 1 auto;
  overflow-y: scroll;
  list-style-type: none;
  padding: 0;
  margin: 0;
`;

const OwnedAsteroids = (props) => {
  const user = useUser();
  const asteroids = useOwnedAsteroids();
  const includeOwned = useAsteroidsStore(state => state.includeOwned);
  const setIncludeOwned = useAsteroidsStore(state => state.setIncludeOwned);

  return (
    <Section title="Owned Asteroids" icon={<AiFillStar />}>
      <Controls>
        {!includeOwned && (
          <IconButton
            data-tip="Show on Map"
            onClick={() => setIncludeOwned(true)}>
            <RiEyeFill />
          </IconButton>
        )}
        {includeOwned && (
          <IconButton
            data-tip="Hide on Map"
            onClick={() => setIncludeOwned(false)}>
            <RiEyeOffFill />
          </IconButton>
        )}
        <IconButton data-tip="Apply Filters"><RiFilter2Fill /></IconButton>
      </Controls>
      <AsteroidList>
        {asteroids.data?.map(a => <AsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default OwnedAsteroids;
