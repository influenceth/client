import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Dock, Ship } from '@influenceth/sdk';

import ClipCorner from '~/components/ClipCorner';
import { MagnifyingIcon, MyAssetIcon } from '~/components/Icons';
import { ResourceImage } from '~/components/ResourceThumbnail';
import { useShipLink } from '~/components/ShipLink';
import { getShipIcon } from '~/lib/assetUtils';
import formatters from '~/lib/formatters';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import { Tray, majorBorderColor } from './components/components';
import useLot from '~/hooks/useLot';
import { MiniBarChart, ShipImage } from '../actionDialogs/components';
import Dropdown from '~/components/Dropdown';
import UncontrolledTextInput from '~/components/TextInputUncontrolled';
import AssetBlock, { assetBlockCornerSize } from '~/components/AssetBlock';
import ThumbnailWithData from '~/components/AssetThumbnailWithData';
import { CrewCaptainCardFramed } from '~/components/CrewmateCardFramed';
import useActionItems from '~/hooks/useActionItems';
import Button from '~/components/ButtonAlt';

const thumbnailDimension = 75;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
`;

const MyAssetWrapper = styled.div`
  position: absolute;
  top: 2px;
  left: 2px;
  color: white;
`;

const Thumbnail = styled.div`
  background: black;
  border: 1px solid ${majorBorderColor};
  ${p => p.theme.clipCorner(10)};
  height: ${thumbnailDimension}px;
  margin-right: 8px;
  position: relative;
  width: ${thumbnailDimension}px;
`;

const SelectableRow = styled.div`
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #999;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  flex-direction: row;
  font-size: 14px;
  padding: 8px 4px;
  position: relative;
  width: 100%;

  ${p => p.selected
    ? `
      border: 1px solid ${p.theme.colors.main};
      background: rgba(${p.theme.colors.mainRGB}, 0.2);
      ${p.theme.clipCorner(10)};
      margin: 4px 0;
      padding: 4px 8px 4px 4px;
    `
    : `
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    `
  }
`;

const Info = styled.div`
  align-self: stretch;
  display: flex;
  flex: 1;
  flex-direction: column;
  
  & > label {
    color: white;
    font-size: 17px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  & > div {
    border-top: 1px solid ${majorBorderColor};
    margin-top: 8px;
    padding-top: 8px;
  }
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

const ShipBlock = styled(AssetBlock)`
  padding-right: 8px;
  margin-bottom: 6px;
  & > div {
    align-items: center;
    display: flex;
    flex-direction: row;
  }
`;

const Ready = styled.div`
  color: ${p => p.theme.colors.main};
  font-weight: bold;
  margin-top: 4px;
  text-transform: uppercase;
`;

const ShipRow = ({ ship }) => {
  const onClickShip = useShipLink({ shipId: ship.id, zoomToShip: true })
  return (
    <SelectableRow onClick={onClickShip}>
      <Thumbnail>
        <MyAssetWrapper><MyAssetIcon /></MyAssetWrapper>
        <ResourceImage src={getShipIcon(ship.Ship.shipType, 'w150')} contain />
        <ClipCorner dimension={10} color={majorBorderColor} />
      </Thumbnail>
      <Info>
        <label>{formatters.shipName(ship)}</label>
        <div style={{ flex: 1 }}></div>
      </Info>
    </SelectableRow>
  );
};

const DockDetails = ({ onClose }) => {
  const { crew } = useCrewContext();

  const lotId = useStore(s => s.asteroids.lot);
  const dispatchZoomScene = useStore(s => s.dispatchZoomScene);

  const { data: lot } = useLot(lotId);

  const { liveBlockTime } = useActionItems();

  const [nameFilter, setNameFilter] = useState('');
  const [selectedShipId, setSelectedShipId] = useState();
  const selectedShip = useMemo(() => lot?.ships?.find((s) => s.id === selectedShipId), [lot?.ships, selectedShipId]);

  const onFilterChange = useCallback((e) => {
    setNameFilter(e.target.value || '');
  }, []);

  const zoomIn = useCallback(() => {
    dispatchZoomScene({ type: 'SHIP', shipId: selectedShipId });
  }, [selectedShipId]);

  const filteredShips = useMemo(() => {
    return (lot?.ships || []).filter((s) => {
      console.log([formatters.shipName(s).toLowerCase(), nameFilter.toLowerCase()]);
      return formatters.shipName(s).toLowerCase().includes(nameFilter.toLowerCase())
    })
  }, [lot?.ships, nameFilter]);

  const barColor = theme.colors.main;
  const dockCapacity = Dock.TYPES[lot?.building?.Dock?.dockType]?.cap || 0;
  return (
    <Wrapper>
      <div style={{ padding: '12px 0', borderBottom: '1px solid #333', marginBottom: 12 }}>
        <MiniBarChart
          color={barColor}
          label="Ship Slots"
          valueStyle={{ color: barColor, fontWeight: 'bold' }}
          valueLabel={`${lot?.ships?.length || 0} / ${dockCapacity}`}
          value={(lot?.ships?.length || 0) / dockCapacity}
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

      <ListWrapper>
        <div>
          {/* TODO: formatting + asset icon */}
          {filteredShips.map((ship) => (
            <ShipBlock key={ship.id} isSelected={selectedShipId === ship.id} onClick={() => setSelectedShipId(ship.id)} subtle>
              <div>
                <ThumbnailWithData noWrap style={{ width: 'calc(100% - 60px)' }}>
                  <ShipImage
                    iconBadge={ship.Control?.controller?.id === crew?.id ? <MyAssetIcon /> : null}
                    shipType={ship.Ship.shipType}
                    style={{ width: 100, height: 85 }} />
                  <label style={{ padding: '0 8px', width: 'calc(100% - 100px)' }}>
                    <h3 style={{ fontSize: '17px' }}>{formatters.shipName(ship)}</h3>
                    <div><b>{Ship.TYPES[ship.Ship.shipType]?.name}</b></div>
                    {liveBlockTime >= ship.Ship.readyAt && <Ready>Launch Ready</Ready>}
                  </label>
                </ThumbnailWithData>
                <div style={{ width: 54 }}>
                  <CrewCaptainCardFramed crewId={ship.Control.controller.id} noAnimation width={54} />
                </div>
              </div>
              <ClipCorner dimension={assetBlockCornerSize} />
            </ShipBlock>
          ))}
        </div>
      </ListWrapper>

      {selectedShip && (
        <Tray>
          <Button onClick={zoomIn} subtle>
            <MagnifyingIcon style={{ marginRight: 8 }} /> Zoom to Ship
          </Button>
          {/* TODO: station / eject / launch / etc? */}
        </Tray>
      )}
    </Wrapper>
  );
};

export default DockDetails;