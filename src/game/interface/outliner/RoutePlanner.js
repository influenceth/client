import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { KeplerianOrbit } from 'influence-utils';
import { RiRouteFill, RiPagesFill } from 'react-icons/ri';
import { MdRemoveCircle } from 'react-icons/md';
import { GiHorizontalFlip } from 'react-icons/gi';

import useStore from '~/hooks/useStore';
import useAsteroid from '~/hooks/useAsteroid';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import AsteroidItem from '~/components/AsteroidItem';
import DataReadout from '~/components/DataReadout';
import constants from '~/lib/constants';

const Controls = styled.div`
  flex: 0 0 auto;
  padding-bottom: 20px;
`;

const AsteroidList = styled.ul`
  list-style-type: none;
  padding: 0 0 5px 0;
  margin: 0;
`;

const AsteroidLabel = styled.li`
  border-top: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 3px 3px 0 0 ;
  color: ${p => p.theme.colors.secondaryText};
  background-color: ${p => p.theme.colors.contentHighlight};
  height: 30px;
  line-height: 30px;
  padding-left: 10px;
`;

const StyledAsteroidItem = styled(AsteroidItem)`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  padding-left: 10px;
`;

const Message = styled.li`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  padding-left: 10px;
  height: 40px;
  line-height: 40px;
`;

const LinkLine = styled.li`
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  height: 50px;
  line-height: 40px;
  margin-left: 30px;
  padding-left: 20px;
`;

const RoutePlanner = (props) => {
  const [ distance, setDistance ] = useState(null);
  const history = useHistory();
  const time = useStore(s => s.time.current);
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const dispatchOriginCleared = useStore(s => s.dispatchOriginCleared);
  const dispatchDestinationCleared = useStore(s => s.dispatchDestinationCleared);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);

  useEffect(() => {
    if (!origin || !destination) {
      setDistance(null);
      return;
    }

    const originPos = (new KeplerianOrbit(origin.orbital)).getPositionAtTime(time);
    const destPos = (new KeplerianOrbit(destination.orbital)).getPositionAtTime(time);
    setDistance(Math.sqrt(
      Math.pow(originPos.x - destPos.x, 2) +
      Math.pow(originPos.y - destPos.y, 2) +
      Math.pow(originPos.z - destPos.z, 2)
    ) * constants.AU / 1000);

  }, [ origin, destination, time ]);

  useEffect(() => {
    return () => dispatchDestinationCleared();
  }, [ dispatchDestinationCleared ]);

  return (
    <Section
      name="routePlanner"
      title="Route Planner"
      icon={<RiRouteFill />}>
      <Controls>
        <IconButton
          data-tip="Route Details"
          disabled={!originId || !destinationId}
          onClick={() => history.push('/route')}>
          <RiPagesFill />
        </IconButton>
        <IconButton
          data-tip="Flip Route"
          onClick={() => {
            dispatchOriginSelected(destinationId);
            dispatchDestinationSelected(originId);
          }}
          disabled={!originId || !destinationId}>
          <GiHorizontalFlip />
        </IconButton>
        <IconButton
          data-tip="Clear Route"
          onClick={() => {
            dispatchOriginCleared();
            dispatchDestinationCleared();
          }}
          disabled={!originId && !destinationId}>
          <MdRemoveCircle />
        </IconButton>
      </Controls>
      <AsteroidList>
        <AsteroidLabel>Origin</AsteroidLabel>
        {origin && <StyledAsteroidItem asteroid={origin} />}
        {!origin && <Message>Select an origin</Message>}
        <LinkLine>
          {distance && <DataReadout label="Distance">{`${Math.round(distance).toLocaleString()} km`}</DataReadout>}
        </LinkLine>
        <AsteroidLabel>Destination</AsteroidLabel>
        {destination && <StyledAsteroidItem asteroid={destination} />}
        {!destination && <Message>Select a destination</Message>}
      </AsteroidList>
    </Section>
  );
};

export default RoutePlanner;
