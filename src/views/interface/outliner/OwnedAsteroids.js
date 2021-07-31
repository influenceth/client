import { useEffect } from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import { AiFillStar } from 'react-icons/ai';
import { RiEyeFill, RiEyeOffFill, RiFilter2Fill, RiTableFill } from 'react-icons/ri';

import useOwnedAsteroids from '~/hooks/useOwnedAsteroids';
import useStore from '~/hooks/useStore';
import IconButton from '~/components/IconButton';
import Section from '~/components/Section';
import AsteroidItem from '~/components/AsteroidItem';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 15px;
`;

const AsteroidList = styled.ul`
  border-top: 1px solid ${props => props.theme.colors.contentBorder};
  box-shadow: inset 0 5px 7px -8px #000;
  flex: 0 1 auto;
  list-style-type: none;
  margin: 0;
  overflow-y: scroll;
  padding: 0;
`;

const StyledAsteroidItem = styled(AsteroidItem)`
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;

  &:hover {
    background-color: rgba(40, 40, 40, 0.5);
    border-top: 1px solid ${props => props.theme.colors.contentBorder};
    border-bottom: 1px solid ${props => props.theme.colors.contentBorder};
  }
`;

const OwnedAsteroids = (props) => {
  const asteroids = useOwnedAsteroids();
  const includeOwned = useStore(state => state.includeOwned);
  const setIncludeOwned = useStore(state => state.setIncludeOwned);
  const history = useHistory();

  // Removes owned asteroids from search set when section is closed
  useEffect(() => {
    return () => setIncludeOwned(false);
  }, [ setIncludeOwned ]);

  let title = 'Owned Asteroids';

  return (
    <Section
      name="ownedAsteroids"
      title="Owned Asteroids"
      icon={<AiFillStar />}>
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
        <IconButton
          data-tip="Open in Table"
          onClick={() => history.push('/owned-asteroids')}>
          <RiTableFill />
        </IconButton>
      </Controls>
      <AsteroidList>
        {asteroids.data?.map(a => <StyledAsteroidItem key={a.i} asteroid={a} />)}
      </AsteroidList>
    </Section>
  );
};

export default OwnedAsteroids;
