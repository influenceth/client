import { useEffect, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { Entity, Ship } from '@influenceth/sdk';

import {
  PurchaseEntityIcon,
  SwayIcon,
  UnplanBuildingIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import useConstructionManager from '~/hooks/actionManagers/useConstructionManager';

import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogBody,
  FlexSection,
  FlexSectionInputBlock,
  FlexSectionSpacer,
  ShipInputBlock,
} from './components';
import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import actionStages from '~/lib/actionStages';
import { locationsArrToObj, reactBool } from '~/lib/utils';
import useNftSaleManager from '~/hooks/actionManagers/useNftSaleManager';
import CrewIndicator from '~/components/CrewIndicator';
import useEntity from '~/hooks/useEntity';
import useCrew from '~/hooks/useCrew';
import { hexToRGB } from '~/theme';
import formatters from '~/lib/formatters';
import { useSwayBalance } from '~/hooks/useWalletBalance';
import useAsteroid from '~/hooks/useAsteroid';

const Alert = styled.div`
  ${p => p.theme.clipCorner(10)};
  background: rgba(${p => hexToRGB(p.theme.colors[p.scheme ? (p.scheme === 'success' ? 'green' : 'red') : 'main'])}, 0.2);
  padding: 4px;
  width: 100%;
  & > div {
    ${p => p.theme.clipCorner(8)};

    background: rgba(${p => hexToRGB(p.theme.colors[p.scheme ? (p.scheme === 'success' ? 'green' : 'red') : 'main'])}, 0.2);
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    padding: 10px;
    
    & label {
      color: ${p => p.theme.colors[p.scheme ? (p.scheme === 'success' ? 'green' : 'red') : 'main']};
      display: block;
      font-size: 15px;
      text-transform: uppercase;
    }
    & b {
      color: white;
      font-weight: normal;
    }

    & > div:first-child {
      flex: 1;
      & > div {
        font-size: 20px;
        & > span {
          margin-left: 6px;
          font-size: 14px;
        }
      }
    }

    & > div:last-child {
      align-items: center;
      display: flex;
      color: white;
      & > label {
        margin-top: 12px;
        margin-right: 2px;
      }
      & > span {
        font-size: 32px;
      }
    }

    &:not(:first-child) {
      align-items: flex-end;
      justify-content: space-between;
      padding: 8px 10px 0;
      & > svg {
        font-size: 24px;
        margin-right: 6px;
      }

      ${p => p.scheme && `
        color: ${p.scheme === 'success' ? p.theme.colors.green : p.theme.colors.red};
      `}
    }
  }
`;

const Note = styled.div`
  color: ${p => p.theme.colors.main};
  padding: 15px 30px 0;
  text-align: center;
`;


const PurchaseEntity = ({ asteroid, lot, entity, actionManager, stage, ...props }) => {
  const { purchaseListing } = actionManager;
  const { crew } = useCrewContext();
  const { data: controller } = useCrew(entity?.Control?.controller?.id);
  const { data: swayBalance } = useSwayBalance();

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    if (lastStatus.current && lastStatus.current !== stage) {
      props.onClose();
    } else if (!lastStatus.current) {
      lastStatus.current = stage;
    }
  }, [stage]);

  const price = useMemo(() => {
    return entity?.Nft?.price / 1e6;
  }, [entity]);

  const insufficientSway = useMemo(() => {
    return swayBalance < price;
  }, [swayBalance, price]);

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <PurchaseEntityIcon />,
          label: 'Buy Ship',
          status: stage === actionStages.NOT_STARTED ? 'Purchase Agreement' : '',
        }}
        actionCrew={crew}
        location={{ asteroid, lot, ship: entity }}
        crewAvailableTime={0}
        onClose={props.onClose}
        taskCompleteTime={0}
        stage={stage} />

      <ActionDialogBody style={{ paddingBottom: 15 }}>
        <FlexSection>
          <ShipInputBlock title="Ship" ship={entity} />

          <FlexSectionSpacer />

          <FlexSectionInputBlock bodyStyle={{ background: 'transparent' }}>
            <CrewIndicator crew={controller} />
            
          </FlexSectionInputBlock>
        </FlexSection>

        <FlexSection>
          <Alert scheme={insufficientSway ? 'error' : 'success'}>
            <div>
              <div>
                <label>Buy Ship</label>
                <div>
                  <b>{formatters.shipName(entity)}</b>
                  {entity?.Name?.name && <span>{Ship.TYPES[entity?.Ship?.shipType]?.name} #{entity.id.toLocaleString()}</span>}
                </div>
              </div>
              <div>
                <label>Total</label>
                <span>
                  <SwayIcon />
                  -{(entity?.Nft?.price / 1e6).toLocaleString()}
                </span>
              </div>
            </div>
          </Alert>
        </FlexSection>

        <Note>Note: Control of the ship's manifest and inventories will transfer with any sale.</Note>
      </ActionDialogBody>

      <ActionDialogFooter
        disabled={insufficientSway}
        goLabel="Buy"
        onGo={purchaseListing}
        stage={stage}
        {...props} />
    </>
  );
};

const Wrapper = ({ entity: rawEntity, ...props }) => {
  const { data: entity, isLoading: entityIsLoading } = useEntity(rawEntity);
  const loc = useMemo(() => locationsArrToObj(entity?.Location?.locations || []), [entity]);
  const { data: asteroid, isLoading: asteroidIsLoading } = useAsteroid(loc.asteroidId);
  const { data: lot, isLoading: lotIsLoading } = useEntity({ id: loc.lotId, label: Entity.IDS.LOT });

  const saleManager = useNftSaleManager(entity);
  const stage = saleManager.isPendingPurchase ? actionStages.STARTING : actionStages.NOT_STARTED

  useEffect(() => {
    if (props.onClose) {
      if (!entity && !entityIsLoading) {
        props.onClose();
      }
      if (loc?.asteroidId && !asteroid && !asteroidIsLoading) {
        props.onClose();
      }
      if (loc?.lotId && !lot && !lotIsLoading) {
        props.onClose();
      }
    }
  }, [asteroid, entity, lot, asteroidIsLoading, lotIsLoading, entityIsLoading]);

  return (
    <ActionDialogInner
      actionImage="Agreements"
      isLoading={reactBool(asteroidIsLoading, lotIsLoading, entityIsLoading)}
      stage={stage}>
      <PurchaseEntity
        asteroid={asteroid}
        lot={lot}
        entity={entity}
        actionManager={saleManager}
        stage={stage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
