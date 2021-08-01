import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { KeplerianOrbit } from 'influence-utils';
import { RiRouteFill, RiPagesFill } from 'react-icons/ri';
import { MdRemoveCircle } from 'react-icons/md';
import { GiHorizontalFlip } from 'react-icons/gi';

import useStore from '~/hooks/useStore';
import Section from '~/components/Section';
import IconButton from '~/components/IconButton';
import AsteroidItem from '~/components/AsteroidItem';
import DataReadout from '~/components/DataReadout';
import constants from '~/constants';

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
  border-top: 1px solid ${props => props.theme.colors.mainBorder};
  border-left: 1px solid ${props => props.theme.colors.mainBorder};
  border-right: 1px solid ${props => props.theme.colors.mainBorder};
  border-radius: 3px 3px 0 0 ;
  color: ${props => props.theme.colors.secondaryText};
  background-color: ${props => props.theme.colors.contentHighlight};
  height: 30px;
  line-height: 30px;
  padding-left: 10px;
`;

const StyledAsteroidItem = styled(AsteroidItem)`
  border-bottom: 1px solid ${props => props.theme.colors.mainBorder};
  border-left: 1px solid ${props => props.theme.colors.mainBorder};
  border-right: 1px solid ${props => props.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  padding-left: 10px;
`;

const Message = styled.li`
  border-bottom: 1px solid ${props => props.theme.colors.mainBorder};
  border-left: 1px solid ${props => props.theme.colors.mainBorder};
  border-right: 1px solid ${props => props.theme.colors.mainBorder};
  border-radius: 0 0 3px 3px;
  padding-left: 10px;
  height: 40px;
  line-height: 40px;
`;

const LinkLine = styled.li`
  border-left: 1px solid ${props => props.theme.colors.mainBorder};
  height: 40px;
  line-height: 40px;
  margin-left: 30px;
  padding-left: 20px;
`;

const RoutePlanner = (props) => {
  const [ distance, setDistance ] = useState(null);
  const time = useStore(state => state.time.current);
  const origin = useStore(state => state.origin);
  const destination = useStore(state => state.destination);
  const deselectOrigin = useStore(state => state.deselectOrigin);
  const deselectDestination = useStore(state => state.deselectDestination);
  const selectOrigin = useStore(state => state.selectOrigin);
  const selectDestination = useStore(state => state.selectDestination);

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
    return () => deselectDestination();
  }, [ deselectDestination ]);

  return (
    <Section
      name="routePlanner"
      title="Route Planner"
      icon={<RiRouteFill />}>
      <Controls>
        <IconButton
          data-tip="Route Details"
          disabled={!origin || !destination}>
          <RiPagesFill />
        </IconButton>
        <IconButton
          data-tip="Flip Route"
          onClick={() => {
            selectOrigin(destination.i);
            selectDestination(origin.i);
          }}
          disabled={!origin || !destination}>
          <GiHorizontalFlip />
        </IconButton>
        <IconButton
          data-tip="Clear Route"
          onClick={() => {
            deselectOrigin(null);
            deselectDestination(null);
          }}
          disabled={!origin && !destination}>
          <MdRemoveCircle />
        </IconButton>
      </Controls>
      <AsteroidList>
        <AsteroidLabel>Origin</AsteroidLabel>
        {origin && <StyledAsteroidItem asteroid={origin} />}
        {!origin && <Message>Select an origin</Message>}
        <LinkLine>
          {distance && <DataReadout label="Distance" data={`${Math.round(distance).toLocaleString()} km`} />}
        </LinkLine>
        <AsteroidLabel>Destination</AsteroidLabel>
        {destination && <StyledAsteroidItem asteroid={destination} />}
        {!destination && <Message>Select a destination</Message>}
      </AsteroidList>
    </Section>
  );
};

export default RoutePlanner;
