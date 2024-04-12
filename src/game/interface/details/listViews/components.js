import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';

import { LocationIcon } from '~/components/Icons';
import { useLotLink } from '~/components/LotLink';
import { useShipLink } from '~/components/ShipLink';

const StyledIconLink = styled.span`
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: inline-block;
  font-size: 20px;
  line-height: 16px;
  margin-right: 2px;
  opacity: 1;
  transition: color 250ms ease, opacity 250ms ease;
  &:hover {
    color: ${p => p.theme.colors.main};
    opacity: 0.5;
  }
`;

export const IconLink = ({ children, onClick, tooltip, ...props }) => {
  const history = useHistory();
  useEffect(() => ReactTooltip.rebuild(), [tooltip]);
  return (
    <StyledIconLink
      data-for="listView"
      data-tip={tooltip}
      data-place="left"
      onClick={onClick}
      {...props}>
      {children}
    </StyledIconLink>
  );
};

export const LocationLink = ({ asteroidId, lotId, resourceId, zoomToLot, ...props }) => {
  const history = useHistory();
  const _onClick = useLotLink({ asteroidId, lotId, resourceId, zoomToLot });
  return (
    <IconLink
      tooltip={`View ${lotId ? 'Lot' : 'Asteroid'}`}
      onClick={() => {
        if (_onClick) {
          history.push('/');
          _onClick();
        }
      }}
      {...props}>
      <LocationIcon />
    </IconLink>
  )
};

export const ShipLocationLink = ({ shipId, ...props }) => {
  const history = useHistory();
  const _onClick = useShipLink({ shipId, zoomToShip: true });
  return (
    <IconLink
      tooltip={'View Ship'}
      onClick={() => {
        history.push('/');
        _onClick();
      }}
      {...props}>
      <LocationIcon />
    </IconLink>
  )
};