import styled from 'styled-components';

import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import PlotInventory from './PlotInventory';
import ResourceMapSelector from './ResourceMapSelector';
import useActionModules from './useActionModules';

export const ActionModule = styled.div`
  border-right: 3px solid ${p => p.theme.colors.main};
  bottom: 0;
  opacity: ${p => p.visible ? 1 : 0};
  padding-right: 32px;
  position: absolute;
  right: 0;
  transition: opacity 350ms ease, transform 350ms ease;
  transform: translateX(${p => p.visible ? 0 : `${p.containerWidth + 5}px`});
  width: 100%;
`;

const ActionModules = ({ containerWidth }) => {
  const visibleModules = useActionModules();

  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      <ActionModule visible={visibleModules.resourceMapSelector} containerWidth={containerWidth}>
        <ResourceMapSelector
          active={visibleModules.resourceMapSelector}
          asteroid={asteroid} />
      </ActionModule>
      <ActionModule visible={visibleModules.plotInventory} containerWidth={containerWidth}>
        <PlotInventory active={visibleModules.plotInventory} asteroid={asteroid} />
      </ActionModule>
    </>
  );
};

export default ActionModules;