import { useEffect, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { css } from 'styled-components';
import { Address, RESOURCES, toResources } from 'influence-utils';

import Details from '~/components/DetailsModal';
import { InfoIcon, CompositionIcon } from '~/components/Icons';
import TabContainer from '~/components/TabContainer';
import useAssets from '~/hooks/useAssets';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import AsteroidInformation from './asteroidDetails/Information';
import AsteroidResources from './asteroidDetails/Resources';

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

// TODO: RESOURCES are one-indexed
const resourceDefs = Object.values(RESOURCES);

// TODO (enhancement): would be nice if at least the asteroid render was shared between the tabs
const AsteroidDetails = (props) => {
  const { account } = useAuth();
  const history = useHistory();
  const { i, tab } = useParams();
  const { data: asteroid } = useAsteroid(Number(i));
  const { data: assets } = useAssets();
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  const isOwner = account && asteroid?.owner && Address.areEqual(account, asteroid.owner);

  // TODO: remove this mock data vvv
  useEffect(() => {
    if (asteroid && true) {
      asteroid.scanned = true;
  
      let remaining = 1;
      asteroid.abundances = resourceDefs.map(() => {
        const abundance = remaining * (Math.random() / 7);
        remaining -= abundance;
        return abundance;
      });
      const extra = remaining / resourceDefs.length;
      asteroid.abundances.forEach((a, i) => asteroid.abundances[i] += extra);
    }
    // if (asteroid) {
    //   asteroid.scanned = false;
    //   asteroid.scanStatus = 'SCANNING';
    // }
  }, [asteroid]);
  // ^^^

  const groupAbundances = useMemo(() => {
    if (assets?.length > 0 && asteroid?.scanned) {
      const asteroidAbundances = toResources(asteroid.abundances || []);

      const categories = {};
      assets
        .map((a) => ({
          ...a,
          i: resourceDefs.findIndex((r) => r.name === a.label) + 1
        }))
        .filter((a) => a.i > 0)
        .forEach((a) => {
          if (!categories[a.bucket]) {
            categories[a.bucket] = {
              category: a.bucket.replace(/[^a-zA-Z]/g, ''),
              label: a.bucket,
              resources: [],
              abundance: 0
            };
          }
          categories[a.bucket].abundance += asteroidAbundances[a.label];
          categories[a.bucket].resources.push({
            i: a.i,
            label: a.label,
            bucket: a.bucket,
            iconUrl: a.iconUrl,
            abundance: asteroidAbundances[a.label],
          });
        });

      // sort resources in each category and sort each category
      return Object.values(categories)
        .map((category) => ({
          ...category,
          resources: category.resources.sort((a, b) => b.abundance - a.abundance)
        }))
        .sort((a, b) => b.abundance - a.abundance);
    }
    return [];
  }, [!!assets, asteroid?.scanned, asteroid?.abundances]);  // eslint-disable-line react-hooks/exhaustive-deps

  const onTabChange = (tabIndex) => {
    if (tabIndex === 1) {
      history.replace(`/asteroids/${asteroid.i}/resources`);
    } else {
      history.replace(`/asteroids/${asteroid.i}`);
    }
  };

  return (
    <Details
      title={`Details - ${asteroid ? (asteroid.customName || asteroid.baseName) : '...'}`}
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
