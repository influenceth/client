import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { Entity } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useStationedCrews from '~/hooks/useStationedCrews';
import useShip from '~/hooks/useShip';
import useActionButtons from '~/hooks/useActionButtons';
import actionButtons from '~/game/interface/hud/actionButtons';
import { CrewInputBlock } from '../actionDialogs/components';
import { HudMenuCollapsibleSection, Scrollable, Tray } from './components/components';
import Button from '~/components/ButtonAlt';
import { MagnifyingIcon } from '~/components/Icons';
import { reactBool } from '~/lib/utils';

const defaultBlockStyle = { marginBottom: 8, width: '100%' };

const StationManifest = () => {
  const { props: actionProps } = useActionButtons();
  const history = useHistory();
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { crew } = useCrewContext();

  const shipId = zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined;
  const { data: ship } = useShip(shipId);
  const { data: crews } = useStationedCrews(shipId ? { id: shipId, label: Entity.IDS.SHIP } : undefined, true);

  const [selectedCrewId, setSelectedCrewId] = useState();
  
  const crewIsStationed = crew?._location?.shipId === ship?.id;
  const hasTray = !crewIsStationed || selectedCrewId;

  const [flightCrew, passengerCrews] = useMemo(() => ([
    crews?.find(c => c.id === ship.Control?.controller?.id),
    crews?.filter(c => c.id !== ship.Control?.controller?.id)
  ]), [crews]);

  const handleInspect = useCallback(() => {
    history.push(`/crew/${selectedCrewId}`);
  }, [selectedCrewId]);

  // TODO: add this to habitat (rename passenger section and hide flight section)

  return (
    <>
      <Scrollable hasTray={reactBool(hasTray)}>
        <HudMenuCollapsibleSection titleText="Flight Crew" collapsed={!flightCrew}>
          <CrewInputBlock
            cardWidth={64}
            crew={flightCrew}
            inlineDetails
            isSelected={selectedCrewId && flightCrew?.id === selectedCrewId}
            onClick={flightCrew ? () => setSelectedCrewId(flightCrew?.id) : null}
            subtle
            style={defaultBlockStyle} />
        </HudMenuCollapsibleSection>

        <HudMenuCollapsibleSection titleText="Passengers">
          {(passengerCrews || []).map((passengerCrew) => (
            <CrewInputBlock
              key={passengerCrew.id}
              cardWidth={64}
              crew={passengerCrew}
              inlineDetails
              isSelected={selectedCrewId && passengerCrew.id === selectedCrewId}
              onClick={() => setSelectedCrewId(passengerCrew.id)}
              subtle
              style={defaultBlockStyle} />
          ))}
        </HudMenuCollapsibleSection>
      </Scrollable>

      {hasTray && (
        <Tray>
          {!crewIsStationed && <actionButtons.StationCrew.Component {...actionProps} />}

          {selectedCrewId && crew?.id === selectedCrewId && <actionButtons.EjectCrew.Component {...actionProps} />}

          {selectedCrewId && crew?.id !== selectedCrewId && selectedCrewId !== flightCrew?.id && (
            <actionButtons.EjectGuestCrew.Component {...actionProps} dialogProps={{ guestId: selectedCrewId }}
            />
          )}

          <div style={{ flex: 1 }} />
          
          {selectedCrewId && (
            <Button onClick={handleInspect} subtle>
              <MagnifyingIcon style={{ marginRight: 8 }} /> Inspect
            </Button>
          )}
        </Tray>
      )}
    </>
  );
};

export default StationManifest;