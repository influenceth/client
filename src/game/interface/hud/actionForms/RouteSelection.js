import { useCallback, useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { TiMediaRecord as OriginIcon } from 'react-icons/ti';
import { TbSwitch2 as SwapIcon } from 'react-icons/tb';
import { MdRadioButtonChecked as DestinationIcon } from 'react-icons/md';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';

import TextInput from '~/components/TextInputUncontrolled';
import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';

const AsteroidInput = styled(TextInput)`
  background: rgba(${p => p.theme.colors.mainRGB}, 0.15);
  flex: 1;
  height: 30px;
`;
const Wrapper = styled.div`
  position: relative;
`;
const Flourish = styled.div`
  position: absolute;
  height: 19px;
  top: 22px;
  border-left: 2px dotted #ccc;
  left: 7px;
`;
const Row = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 30px;
  margin-top: 6px;
  width: 100%;
  & > *:nth-child(2) {
    margin-left: 6px;
    margin-right: 8px;
  }
  label {
    flex: 1;
    font-weight: bold;
    padding-left: 5px;
  }

  &:first-child {
    margin-top: 0;
  }
`;

// TODO: asteroid typeahead component
const RouteSelection = () => {
  const destinationId = useStore(s => s.asteroids.destination);
  const originId = useStore(s => s.asteroids.origin);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchSwapOriginDestination = useStore(s => s.dispatchSwapOriginDestination);
  const dispatchTravelMode = useStore(s => s.dispatchTravelMode);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);

  const destInput = useRef();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      let newDestId = parseInt(e.currentTarget.value);
      if (newDestId > 0 && newDestId <= 250000 && newDestId !== originId) {
        dispatchDestinationSelected(newDestId);
      } else {
        dispatchDestinationSelected(null);
      }
      // TODO: alert on error
    }
  }, []);

  const handleSwap = useCallback(() => {
    if (originId && destinationId) dispatchSwapOriginDestination();
  }, [destinationId, originId]);

  const handleClose = useCallback(() => {
    dispatchDestinationSelected();
    dispatchTravelMode(false);
  }, []);

  useEffect(() => {
    destInput.current.value = destinationId;
  }, [destinationId]);

  return (
    <>
      <Wrapper>
        <Row>
          <OriginIcon />
          <label>{origin?.customName || origin?.baseName || `Asteroid #${originId || ''.toLocaleString()}`}</label>
          {origin && destination && (
            <IconButton
              borderless
              data-tip="Swap origin/destination..."
              data-place="right"
              onClick={handleSwap}
              style={{ color: '#777' }}><SwapIcon /></IconButton>
          )}
        </Row>
        <Row>
          <DestinationIcon />
          <AsteroidInput
            ref={destInput}
            onKeyDown={handleKeyDown}
            placeholder="Asteroid Id..." />
          <IconButton
            data-tip="Close Route Selection"
            data-place="right"
            onClick={handleClose}><CloseIcon /></IconButton>
        </Row>
        <Flourish />
      </Wrapper>
    </>
  );
}

export default RouteSelection;