import { Entity } from '@influenceth/sdk';

import useAsteroid from '~/hooks/useAsteroid';
import useStore from '~/hooks/useStore';
import { HudMenuCollapsibleSection, Scrollable } from './components/components';
import EntityNameForm from './components/EntityNameForm';
import AsteroidTitleArea from './components/AsteroidTitleArea';
import EntityDescriptionForm from './components/EntityDescriptionForm';
import PolicyPanels from './components/PolicyPanels';
import { LinkIcon } from '~/components/Icons';
import MarketplaceLink from '~/components/MarketplaceLink';
import Button from '~/components/ButtonAlt';
import { renderDummyAsteroid } from '~/game/scene/asteroid/helpers/utils';
import constants from '~/lib/constants';
import exportGLTF from '~/lib/graphics/exportGLTF';
import useWebWorker from '~/hooks/useWebWorker';
import { useCallback, useState } from 'react';
import { nativeBool, reactBool } from '~/lib/utils';
import styled from 'styled-components';
import CrewIndicator from '~/components/CrewIndicator';
import useCrew from '~/hooks/useCrew';

const AdminActions = styled.div`
  border-bottom: 1px solid #333;
  margin-bottom: 20px;
  padding-bottom: 15px;
`;
const ButtonArea = styled.div`
  & > button {
    margin-bottom: 10px;
    width: 260px;
  }
`;

const AdminAsteroid = ({}) => {
  const asteroidId = useStore(s => s.asteroids.origin);
  const { data: asteroid } = useAsteroid(asteroidId);
  const { data: controller } = useCrew(asteroid?.Control?.controller?.id);
  const webWorkerPool = useWebWorker();

  const [exportingModel, setExportingModel] = useState(false);

  const download3dModel = useCallback(() => {
    if (exportingModel || !asteroid) return;
    setExportingModel(true);
    renderDummyAsteroid(asteroid, constants.MODEL_EXPORT_RESOLUTION, webWorkerPool, (asteroidModel, dispose) => {
      exportGLTF(asteroidModel, `asteroid_${asteroid.id}`, () => {
        try {
          dispose();
        } catch (e) { console.warn(e); }
        setExportingModel(false);
      });
    });
  }, [asteroid, exportingModel, webWorkerPool]);

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

        <HudMenuCollapsibleSection titleText="Update Lot Policy" collapsed>
          <PolicyPanels editable entity={asteroid} />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Admin Actions" collapsed>
          <AdminActions>
            <CrewIndicator crew={controller} label="Administrator" />
          </AdminActions>

          <ButtonArea>
            <MarketplaceLink
              chain={asteroid?.Nft?.chain}
              assetType="asteroid"
              id={asteroid?.id}>
              {(onClick, setRefEl) => (
                <Button setRef={setRefEl} onClick={onClick}><LinkIcon /> <span>List for Sale</span></Button>
              )}
            </MarketplaceLink>

            <Button
              disabled={nativeBool(exportingModel)}
              loading={reactBool(exportingModel)}
              onClick={download3dModel}>
              Download 3D Model
            </Button>
          </ButtonArea>
        </HudMenuCollapsibleSection>

      </Scrollable>
    </>
  );
};

export default AdminAsteroid;
