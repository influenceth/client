import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { css } from 'styled-components';
import { Address } from 'influence-utils';

import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

import Details from '~/components/DetailsModal';
import { InfoIcon, CompositionIcon } from '~/components/Icons';
import TabContainer from '~/components/TabContainer';
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


export const resourceDefs = [
  'Ammonia',
  'Carbon Dioxide',
  'Carbon Monoxide',
  'Hydrogen',
  'Methane',
  'Nitrogen',
  'Surfur Dioxide',
  'Water',
  'Bitumen',
  'Calcite',
  'Magnesite',
  'Graphite',
  'Rhabdite',
  'Taenite',
  'Troilite',
  'Merrillite',
  'Xenotime',
  'Coffinite',
  'Uranite'
];

export const categoryDefs = {
  'Volatiles': {
    label: 'Volatiles',
    resources: [0, 1, 2, 3, 4, 5, 6, 7,]
  },
  'Organic': {
    label: 'Organic',
    resources: [8, 9, 10]
  },
  'Metal': {
    label: 'Metal',
    resources: [11, 12, 13, 14]
  },
  'RareEarth': {
    label: 'Rare-Earth',
    resources: [15, 16]
  },
  'Fissile': {
    label: 'Fissile',
    resources: [17, 18]
  },
};

// generate random abundances
let remaining = 1;
let abundances = resourceDefs.map(() => {
  const abundance = remaining * (Math.random() / 7);
  remaining -= abundance;
  return abundance;
});
const extra = remaining / resourceDefs.length;
abundances.forEach((a, i) => abundances[i] = a + extra);
// abundances = [];


// TODO (enhancement): would be nice if at least the asteroid render was shared between the tabs


const AsteroidDetails = (props) => {
  const { account } = useAuth();
  const { i, tab } = useParams();
  const { data: asteroid } = useAsteroid(Number(i));
  const dispatchOriginSelected = useStore(s => s.dispatchOriginSelected);

  // Force the asteroid to load into the origin if coming direct from URL
  useEffect(() => {
    if (i) dispatchOriginSelected(Number(i));
  }, [ i, dispatchOriginSelected ]);

  const isOwner = account && asteroid?.owner && Address.areEqual(account, asteroid.owner);

  // TODO: this is mock data
  if (asteroid && abundances.length > 0) {
    asteroid.scanned = true;
  }

  const groupAbundances = useMemo(() => {
    if (asteroid?.scanned) {
      return Object.keys(categoryDefs)
        .map((k) => {
          const { label, resources } = categoryDefs[k];
          return {
            category: k,
            label,
            resources: resources.map((resource) => ({ resource, abundance: abundances[resource] || 0 })).sort((a, b) => b.abundance - a.abundance),
            abundance: resources.reduce((acc, i) => acc + (abundances[i] || 0), 0),
          };
        })
        .sort((a, b) => b.abundance - a.abundance);
    }
    return [];
  }, [asteroid?.scanned]);

  return (
    <Details
      title={`Details - ${asteroid ? (asteroid.customName || asteroid.baseName) : '...'}`}
      width="max">
      {asteroid && (
        <TabContainer
          containerCss={tabContainerCss}
          initialActive={tab === 'resources' ? 1 : 0}
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
