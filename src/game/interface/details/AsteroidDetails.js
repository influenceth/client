import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { css } from 'styled-components';

import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';

import Details from '~/components/DetailsModal';
import { InfoIcon, CompositionIcon } from '~/components/Icons';
import TabContainer from '~/components/TabContainer';
import AsteroidComposition from './asteroidDetails/Composition';
import AsteroidInformation from './asteroidDetails/Information';

const breakpoint = 1375;
const tabContainerCss = css`
  color: #777;
  flex: 0 0 330px;
  @media (min-height: 950px) {
    flex-basis: 45%;
  }
  @media (max-width: ${breakpoint}px) {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.05);
    border: 2px solid rgba(${p => p.theme.colors.mainRGB}, 0.15);
    border-left: none;
    border-right: none;
    box-shadow: -4px 0 8px rgba(${p => p.theme.colors.mainRGB}, 0.25);
    margin-top: 0;
  }
`;

const AsteroidDetails = (props) => {
  const { i } = useParams();
  const { data: asteroid } = useAsteroid(Number(i));
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);


  // TODO: tabContainer
  //  left-aligned
  //  underline is centered under word

  return (
    <Details
      title={`Details - ${asteroid ? (asteroid.customName || asteroid.baseName) : '...'}`}
      width="max">
      {asteroid && (
        <TabContainer
          containerCss={tabContainerCss}
          tabCss={{ textTransform: 'uppercase', width: '200px' }}
          tabs={[
            {
              icon: <InfoIcon />,
              label: 'Information',
            },
            {
              icon: <CompositionIcon />,
              label: 'Composition'
            }
          ]}
          panes={[
            <AsteroidInformation asteroid={asteroid} />,
            <AsteroidComposition asteroid={asteroid} />
          ]}
          
        />
      )}
    </Details>
  );
};

export default AsteroidDetails;
