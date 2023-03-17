import { useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { LocationIcon } from '~/components/Icons';
import { usePlotLink } from '~/components/PlotLink';

const LocLink = styled.span`
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

export const LocationLink = ({ asteroidId, plotId, resourceId, zoomToPlot }) => {
  const history = useHistory();
  const _onClick = usePlotLink({ asteroidId, plotId, resourceId, zoomToPlot });
  return (
    <LocLink
      data-for="listView"
      data-tip={`View ${plotId ? 'Lot' : 'Asteroid'}`}
      data-place="left"
      onClick={() => {
        history.push('/');
        _onClick();
      }}>
      <LocationIcon />
    </LocLink>
  )
};