import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { css } from 'styled-components';
import { Address } from '@influenceth/sdk';

import Details from '~/components/DetailsModal';
import { InfoIcon, CompositionIcon } from '~/components/Icons';
import TabContainer from '~/components/TabContainer';
import useAsteroidAbundances from '~/hooks/useAsteroidAbundances';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import AsteroidInformation from './asteroidDetails/Information';
import AsteroidResources from './asteroidDetails/Resources';
import formatters from '~/lib/formatters';

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
    padding: 0 20px;
    margin-top: 0;
  }
`;

// TODO (enhancement): would be nice if at least the asteroid render was shared between the tabs
const AsteroidDetails = () => {
  const { account } = useAuth();
  const history = useHistory();
  const { i, tab } = useParams();
  const { data: asteroid } = useAsteroid(Number(i));
  const groupAbundances = useAsteroidAbundances(asteroid);
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  const isOwner = account && asteroid?.Nft?.owners?.starknet && Address.areEqual(account, asteroid.Nft.owners.starknet);

  const onTabChange = (tabIndex) => {
    if (tabIndex === 1) {
      history.replace(`/asteroids/${asteroid.id}/resources`);
    } else {
      history.replace(`/asteroids/${asteroid.id}`);
    }
  };

  return (
    <Details
      title={`Details - ${formatters.asteroidName(asteroid, '...')}`}
      width="max">
      {asteroid && (
        <TabContainer
          containerCss={tabContainerCss}
          initialActive={tab === 'resources' ? 1 : 0}
          onChange={onTabChange}
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
            <AsteroidInformation asteroid={asteroid} isOwner={isOwner} abundances={groupAbundances} />,
            <AsteroidResources asteroid={asteroid} isOwner={isOwner} abundances={groupAbundances} />
          ]}

        />
      )}
    </Details>
  );
};

export default AsteroidDetails;
