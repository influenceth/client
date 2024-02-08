import { Entity } from '@influenceth/sdk';

import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityNameForm from './components/EntityNameForm';
import AsteroidTitleArea from './components/AsteroidTitleArea';
import EntityDescriptionForm from './components/EntityDescriptionForm';

const AdminAsteroid = ({}) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  return (
    <>
      <Scrollable>
        <AsteroidTitleArea asteroid={asteroid} />

        <HudMenuCollapsibleSection titleText="Update Name" collapsed>
          <EntityNameForm
            entity={asteroid ? { id: asteroid.id, label: Entity.IDS.ASTEROID } : null}
            originalName={asteroid?.Name?.name}
            label="Asteroid Name" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Description" collapsed>
          <EntityDescriptionForm
            entity={asteroid ? { id: asteroid.id, label: Entity.IDS.ASTEROID } : null}
            originalDesc={``}
            label="Asteroid Description" />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Update Permissions" collapsed>
          {/* TODO ... */}
        </HudMenuCollapsibleSection>

      </Scrollable>
    </>
  );
};

export default AdminAsteroid;
