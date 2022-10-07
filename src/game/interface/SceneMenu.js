import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import utils, { Address } from 'influence-utils';

import Button from '~/components/ButtonAlt';
import { InfoIcon, CompositionIcon } from '~/components/Icons';
import useAsteroid from '~/hooks/useAsteroid';
import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';
import TabContainer from '~/components/TabContainer';

const Pane = styled.div`
  opacity: ${p => p.visible ? 1 : 0};
  overflow: hidden;
  padding: 0 0 140px 80px;
  position: absolute;
  bottom: 0;
  left: 0;
  transition: opacity 750ms ease;
  width: 500px;
`;

const Title = styled.div`
  color: white;
  font-size: 50px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Subtitle = styled.div`
  color: #999;
  font-size: 18px;
  margin-bottom: 16px;
  & b {
    color: white;
  }
`;
// const Tabs = styled.div`
//   border-bottom: 1px solid #555;
//   display: flex;
//   flex-direction: row;
//   width: 100%;
// `;
// const TabIcon = styled.div``;
// const TabLabel = styled.div``;
// const Tab = styled.div`
//   align-items: center;
//   display: flex;
//   margin-bottom: -1px;
//   pointer-events: auto;
//   transition: color 250ms ease;
//   width: 50%;

//   ${p => p.disabled
//     ? `color: #555;`
//     : `
//       color: ${p.theme.colors.main};
//       cursor: ${p.theme.cursors.active};
//       &:hover { color: white; }
//   `}

//   & > ${TabIcon} {
//     font-size: 18px;
//     padding-right: 8px;
//   }
//   & > ${TabLabel} {
//     font-size: 15px;
//     padding: 16px 0;
//     position: relative;
//     &:after {
//       bottom: 0;
//       content: "";
//       position: absolute;
//       left: 50%;
//       margin-left: -16px;
//       width: 32px;
//       border-bottom: 5px solid currentColor;
//     }
//   }
// `;
const ExtraInfo = styled.div`
  color: #AAA;
  font-size: 15px;
  padding-top: 24px;
  padding-bottom: 16px;
  & > b {
    color: ${p => p.theme.colors.main};
  }
`;

const SceneMenu = (props) => {
  const { account } = useAuth();
  const origin = useStore(s => s.asteroids.origin);
  const zoomStatus = useStore(s => s.asteroids.zoomStatus);
  const history = useHistory();

  const [activeTab, setActiveTab] = useState(0);

  const { data: asteroid } = useAsteroid(origin);

  // TODO: back button

  const onSetTab = (tabIndex) => {
    if (tabIndex === 0) {
      setActiveTab(0);
      history.push(`/asteroids/${asteroid.i}`);
    } else if (tabIndex === 1) {
      if (asteroid.scanned) {
        setActiveTab(1);
        // TODO: heatmaps
      } else {
        history.push(`/asteroids/${asteroid.i}/resources`);
      }
    }
  };

  if (!asteroid) return null;
  return (
    <>
      <Pane visible={zoomStatus === 'in'}>
        <Title>{asteroid.customName || asteroid.baseName}</Title>
        <Subtitle>
          {utils.toSize(asteroid.radius)} <b>{utils.toSpectralType(asteroid.spectralType)}-type</b>
        </Subtitle>
        <TabContainer
          containerHeight={'50px'}
          containerCss={{ color: '#777' }}
          controller={{
            active: activeTab,
            setActive: onSetTab
          }}
          tabCss={{ fontSize: '15px', width: '50%' }}
          tabs={[
            {
              icon: <InfoIcon />,
              label: 'Asteroid Details',
            },
            {
              icon: <CompositionIcon />,
              label: 'Resource Map',
            }
          ]}
        />
        {!asteroid.scanned && asteroid.owner && account && Address.areEqual(asteroid.owner, account) && (
          <ExtraInfo>
            <b>You own this asteroid.</b> Scan it to determine its<br/>
            final resource composition and bonuses.

            <Button
              onClick={() => history.push(`/asteroids/${asteroid.i}/resources`)}
              style={{ marginTop: 10 }}>
              Scan Asteroid
            </Button>
          </ExtraInfo>
        )}

        {/* TODO: grow to show */}
        {asteroid.scanned && activeTab === 1 && (
          <div>TODO</div>
        )}
      </Pane>
    </>
  );
};

export default SceneMenu;