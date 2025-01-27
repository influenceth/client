import { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Building } from '@influenceth/sdk';

import {
  PermissionIcon,
  TakeControlIcon
} from '~/components/Icons';
import useCrewContext from '~/hooks/useCrewContext';
import theme, { hexToRGB } from '~/theme';
import { reactBool, formatTimer } from '~/lib/utils';

import { ActionDialogInner, useAsteroidAndLot } from '../ActionDialog';
import {
  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,

  FlexSection,
  FlexSectionInputBlock,
  ActionDialogBody,
  BuildingInputBlock,
  FlexSectionSpacer,
  FlexSectionBlock
} from './components';
import actionStage from '~/lib/actionStages';
import useRepoManager from '~/hooks/actionManagers/useRepoManager';
import CrewIndicator from '~/components/CrewIndicator';
import useCrew from '~/hooks/useCrew';

const DescTitle = styled.div`
  align-items: center;
  background: rgba(${p => hexToRGB(p.theme.colors.error)}, 0.5);
  color: white;
  display: flex;
  font-size: 21px;
  padding: 8px;
  & svg {
    font-size: 26px;
    margin-right: 6px;
  }
`;

const Desc = styled.div`
  color: ${p => p.theme.colors.main};
  font-size: 90%;
  padding: 10px;
  & > b {
    color: white;
    font-weight: normal;
  }
`;

const MouseoverWarning = styled.span`
  & b { color: ${theme.colors.error}; }
  & em { font-weight: bold; font-style: normal; color: white; }
`;

const RepoBuilding = ({ asteroid, lot, actionManager, stage, ...props }) => {
  const { repoBuilding } = actionManager;
  const { crew } = useCrewContext();
  const { data: delinquentController } = useCrew(lot?.building?.Control?.controller?.id);

  const stats = useMemo(() => ([]), []);

  // TODO: if repo construction site, go to "construct" dialog after

  const buildingOrSite = lot?.building?.Building?.status === Building.CONSTRUCTION_STATUSES.OPERATIONAL
    ? 'Building'
    : 'Construction Site';

  return (
    <>
      <ActionDialogHeader
        action={{
          icon: <TakeControlIcon />,
          label: `Repossess ${buildingOrSite}`,
          status: stage === actionStage.NOT_STARTED ? 'Owner Action' : undefined,
        }}
        overrideColor={stage === actionStage.NOT_STARTED ? theme.colors.error : undefined}
        actionCrew={crew}
        location={{ asteroid, lot }}
        onClose={props.onClose}
        stage={stage} />

      <ActionDialogBody>
        <FlexSection>
          <BuildingInputBlock
            title="Location"
            building={lot?.building}
          />

          <FlexSectionSpacer />

          <FlexSectionInputBlock title="Details">
            <DescTitle>
              <PermissionIcon />
              <span>Take Control of {buildingOrSite === 'Construction Site' ? 'Site' : buildingOrSite}</span>
            </DescTitle>
            <Desc>
              You have <b>Lot Control</b> and may assume control of this asset.
            </Desc>
          </FlexSectionInputBlock>
        </FlexSection>

        <FlexSection style={{ marginBottom: 10 }}>
          <FlexSectionBlock>
            <CrewIndicator crew={delinquentController} label="Claim from" />
          </FlexSectionBlock>
        </FlexSection>

        <ActionDialogStats
          stage={stage}
          stats={stats}
        />

        {stats?.length > 0 ? null : <div style={{ height: 20 }} />}
      </ActionDialogBody>

      <ActionDialogFooter
        goLabel="Repossess"
        onGo={repoBuilding}
        stage={stage}
        waitForCrewReady
        {...props} />
    </>
  );
};

const Wrapper = (props) => {
  const { asteroid, lot, isLoading } = useAsteroidAndLot(props);
  const { accountCrewIds } = useCrewContext();
  const repoManager = useRepoManager(lot?.id);
  const { actionStage } = repoManager;

  useEffect(() => {
    if (!asteroid || !lot) {
      if (!isLoading) {
        if (props.onClose) props.onClose();
      }
    }

    if (asteroid && lot && accountCrewIds) {
      if (accountCrewIds.includes(lot.Control?.controller?.id)) {
        if (!accountCrewIds.includes(lot.building?.Control?.controller?.id)) {
          if (props.onClose) props.onClose();
        }
      }
    }
  }, [asteroid, lot, isLoading]);

  return (
    <ActionDialogInner
      actionImage="Management"
      isLoading={reactBool(isLoading)}
      stage={actionStage}>
      <RepoBuilding
        asteroid={asteroid}
        lot={lot}
        actionManager={repoManager}
        stage={actionStage}
        {...props} />
    </ActionDialogInner>
  )
};

export default Wrapper;
