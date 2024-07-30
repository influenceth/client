import { useCallback } from 'react';
import styled from 'styled-components';
import { TiMediaRecord as OriginIcon } from 'react-icons/ti';
import { TbSwitch2 as SwapIcon } from 'react-icons/tb';
import { MdRadioButtonChecked as DestinationIcon } from 'react-icons/md';

import IconButton from '~/components/IconButton';
import { CloseIcon } from '~/components/Icons';

import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import Autocomplete from '~/components/Autocomplete';
import formatters from '~/lib/formatters';
import useCoachmarkRefSetter from '~/hooks/useCoachmarkRefSetter';
import { COACHMARK_IDS } from '~/contexts/CoachmarkContext';

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
  svg:first-child {
    width: 16px;
  }

  &:first-child {
    margin-top: 0;
  }
`;

const RouteSelection = () => {
  const destinationId = useStore(s => s.asteroids.destination);
  const originId = useStore(s => s.asteroids.origin);
  const dispatchDestinationSelected = useStore(s => s.dispatchDestinationSelected);
  const dispatchSwapOriginDestination = useStore(s => s.dispatchSwapOriginDestination);
  const dispatchHudMenuOpened = useStore(s => s.dispatchHudMenuOpened);
  const { data: origin } = useAsteroid(originId);
  const { data: destination } = useAsteroid(destinationId);
  const setCoachmarkRef = useCoachmarkRefSetter();

  const handleSwap = useCallback(() => {
    if (originId && destinationId) dispatchSwapOriginDestination();
  }, [destinationId, dispatchSwapOriginDestination, originId]);

  const handleClose = useCallback(() => {
    dispatchDestinationSelected();
    dispatchHudMenuOpened();
  }, [dispatchDestinationSelected, dispatchHudMenuOpened]);

  const handleSelect = useCallback((dest) => {
    if (Number(dest?.id) !== Number(originId)) dispatchDestinationSelected(dest?.id)
  }, [dispatchDestinationSelected, originId]);

  return (
    <>
      <Wrapper>
        <Row>
          <OriginIcon />
          <label>{formatters.asteroidName(origin)}</label>
          {origin && destination && (
            <IconButton
              borderless
              data-tooltip-content="Swap origin/destination..."
              data-tooltip-place="right"
              onClick={handleSwap}
              style={{ color: '#777' }}><SwapIcon /></IconButton>
          )}
        </Row>
        <Row>
          <DestinationIcon />
          <Autocomplete
            assetType="asteroids"
            dropdownProps={{ style: { maxHeight: 115 }}}
            placeholder="Destination Asteroid..."
            onSelect={handleSelect}
            selected={destination}
            setRef={setCoachmarkRef(COACHMARK_IDS.destinationAsteroid)}
            width={180} />
          <IconButton
            data-tooltip-content="Close Route Selection"
            data-tooltip-place="right"
            onClick={handleClose}><CloseIcon /></IconButton>
        </Row>
        <Flourish />
      </Wrapper>
    </>
  );
}

export default RouteSelection;