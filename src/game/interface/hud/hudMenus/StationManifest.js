import { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { Permission, Station } from '@influenceth/sdk';

import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import useHydratedCrew from '~/hooks/useHydratedCrew';
import useStationedCrews from '~/hooks/useStationedCrews';
import useShip from '~/hooks/useShip';
import useActionButtons from '~/hooks/useActionButtons';
import actionButtons from '~/game/interface/hud/actionButtons';
import { CrewInputBlock, MiniBarChart } from '../actionDialogs/components';
import { HudMenuCollapsibleSection, Scrollable, Tray } from './components/components';
import Button from '~/components/ButtonAlt';
import { MagnifyingIcon } from '~/components/Icons';
import { reactBool } from '~/lib/utils';
import useLot from '~/hooks/useLot';
import theme from '~/theme';
import Dropdown from '~/components/Dropdown';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import formatters from '~/lib/formatters';

const defaultBlockStyle = { marginBottom: 8, width: '100%' };

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
`;

const FilterRow = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  padding-bottom: 12px;
  & > *:first-child, & > *:last-child {
    flex: 1;
  }
`;
const ListWrapper = styled.div`
  flex: 1;
  overflow: hidden auto;
`;

const StationManifest = () => {
  const { props: actionProps } = useActionButtons();
  const history = useHistory();
  const lotId = useStore(s => s.asteroids.lot);
  const zoomScene = useStore(s => s.asteroids.zoomScene);

  const { crew, crewCan } = useCrewContext();
  const { data: lot } = useLot(lotId);

  const shipId = zoomScene?.type === 'SHIP' ? zoomScene.shipId : undefined;
  const { data: ship } = useShip(shipId);

  const station = useMemo(() => shipId ? ship : lot?.building, [ship, lot]);
  const { data: unfilteredCrews } = useStationedCrews(station);

  const [nameFilter, setNameFilter] = useState('');
  const [selectedCrewId, setSelectedCrewId] = useState();

  const onFilterChange = useCallback((e) => {
    setNameFilter(e.target.value || '');
  }, []);

  const canStation = useMemo(
    () => crewCan(Permission.IDS.STATION_CREW, station),
    [crewCan, station]
  );

  const crews = useMemo(() => {
    return (unfilteredCrews || [])
      .filter((c) => formatters.crewName(c).toLowerCase().includes(nameFilter.toLowerCase()))
      .map((c) => ({ ...c, _crewmates: c.Crew.roster.map((id) => ({ id })) }))
      .sort((a, b) => formatters.crewName(a) < formatters.crewName(b) ? -1 : 1)
  }, [unfilteredCrews, nameFilter]);
  
  const crewIsStationed = shipId ? (crew?._location?.shipId === ship?.id) : (crew?._location?.buildingId === lot?.building?.id);
  const hasTray = !crewIsStationed || selectedCrewId;

  const [flightCrew, passengerCrews, population] = useMemo(() => ([
    crews?.find(c => c.id === ship?.Control?.controller?.id),
    crews?.filter(c => c.id !== ship?.Control?.controller?.id),
    unfilteredCrews?.reduce((acc, cur) => acc + cur.Crew.roster.length, 0)
  ]), [crews, ship, unfilteredCrews]);

  const handleInspect = useCallback(() => {
    history.push(`/crew/${selectedCrewId}`);
  }, [selectedCrewId]);

  const barColor = theme.colors.main;
  const stationCapacity = Station.TYPES[station?.Station?.stationType]?.cap || 0;
  return (
    <Wrapper>
      {!shipId && (
        <>
          <div style={{ padding: '12px 0', borderBottom: '1px solid #333', marginBottom: 12 }}>
            <MiniBarChart
              color={barColor}
              label="Station Population"
              valueStyle={{ color: barColor, fontWeight: 'bold' }}
              valueLabel={`${population || 0} / ${stationCapacity}`}
              value={(population || 0) / stationCapacity}
            />
          </div>

          <FilterRow>
            <div>
              <Dropdown
                disabled
                background="transparent"
                options={['Alphabetically']}
                size="small"
                textTransform="none"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ width: 8 }} />

            <UncontrolledTextInput onChange={onFilterChange} placeholder="Filter by Name" />
          </FilterRow>
        </>
      )}

      <ListWrapper>
        {shipId && (
          <>
            <HudMenuCollapsibleSection titleText="Flight Crew" collapsed={!flightCrew}>
              <div style={{ paddingRight: 10 }}>
                <CrewInputBlock
                  cardWidth={64}
                  crew={flightCrew}
                  inlineDetails
                  isSelected={selectedCrewId && flightCrew?.id === selectedCrewId}
                  onClick={flightCrew ? () => setSelectedCrewId(flightCrew?.id) : null}
                  subtle
                  style={defaultBlockStyle} />
              </div>
            </HudMenuCollapsibleSection>

            <HudMenuCollapsibleSection titleText="Passengers" collapsed={!(passengerCrews?.length > 0)}>
              <div style={{ paddingRight: 10 }}>
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
              </div>
            </HudMenuCollapsibleSection>
          </>
        )}
        {!shipId && (
          <>
            {(crews || []).map((c) => (
              <CrewInputBlock
                key={c.id}
                cardWidth={64}
                crew={c}
                inlineDetails
                isSelected={selectedCrewId && c.id === selectedCrewId}
                onClick={() => setSelectedCrewId(c.id)}
                subtle
                style={defaultBlockStyle} />
            ))}
          </>
        )}
      </ListWrapper>

      {hasTray && (
        <Tray>
          {!crewIsStationed && (
            <actionButtons.StationCrew.Component
              {...actionProps}
              labelAddendum={canStation ? '' : 'access restricted'}
              flags={{ disabled: !canStation }}
            />
          )}

          {selectedCrewId && crew?.id === selectedCrewId && <actionButtons.EjectCrew.Component {...actionProps} />}

          {selectedCrewId && crew?.id !== selectedCrewId && crew?.id === station?.Control?.controller?.id && (
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
    </Wrapper>
  );
};

export default StationManifest;