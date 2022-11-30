import { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { KeplerianOrbit } from '@influenceth/sdk';
import { RiRouteFill } from 'react-icons/ri';
import { MdRemoveCircle } from 'react-icons/md';
import { GiHorizontalFlip } from 'react-icons/gi';

import ClockContext from '~/contexts/ClockContext';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import AsteroidById from '~/components/AsteroidById';
import AsteroidItem from '~/components/AsteroidItem';
import DataReadout from '~/components/DataReadout';
import IconButton from '~/components/IconButton';
import { DetailIcon } from '~/components/Icons';
import Section from '~/components/Section';
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
  border-top: 0 !important;
  padding-left: 10px;
`;

const Message = styled.li`
  border-bottom: 1px solid ${p => p.theme.colors.mainBorder};
  border-left: 1px solid ${p => p.theme.colors.mainBorder};
  border-right: 1px solid ${p => p.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  padding: 10px;
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
  const originId = useStore(s => s.asteroids.origin);
  const destinationId = useStore(s => s.asteroids.destination);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);

  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const { coarseTime: time } = useContext(ClockContext);

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
    return () => dispatchDestinationSelected();
  }, [ dispatchDestinationSelected ]);

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
          <DetailIcon />
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
            dispatchOriginSelected();
            dispatchDestinationSelected();
          }}
          disabled={!originId && !destinationId}>
          <MdRemoveCircle />
        </IconButton>
      </Controls>
      <AsteroidList>
        <AsteroidLabel>Origin</AsteroidLabel>
        {origin && <StyledAsteroidItem asteroid={origin} />}
        {!origin && (
          <Message>
            <span>Select an asteroid (left-click map)</span>
            <AsteroidById targetAsteroid="origin" />
          </Message>
        )}
        <LinkLine>
          {distance && <DataReadout label="Distance">{`${Math.round(distance).toLocaleString()} km`}</DataReadout>}
        </LinkLine>
        <AsteroidLabel>Destination</AsteroidLabel>
        {destination && <StyledAsteroidItem asteroid={destination} />}
        {!destination && (
          <Message>
            <span>Select a destination (right-click map)</span>
            <AsteroidById targetAsteroid="destination" />
          </Message>
        )}
      </AsteroidList>
    </Section>
  );
};

export default RoutePlanner;
