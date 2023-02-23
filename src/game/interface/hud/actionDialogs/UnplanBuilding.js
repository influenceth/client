import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import {
  FiCrosshair as TargetIcon,
  FiSquare as UncheckedIcon,
  FiCheckSquare as CheckedIcon
} from 'react-icons/fi';
import { RingLoader } from 'react-spinners';
import DataTable, { createTheme } from 'react-data-table-component';
import { Crew, Asteroid, Construction, Lot } from '@influenceth/sdk';

import constructionBackground from '~/assets/images/modal_headers/Construction.png';
import coreSampleBackground from '~/assets/images/modal_headers/CoreSample.png';
import extractionBackground from '~/assets/images/modal_headers/Extraction.png';
import surfaceTransferBackground from '~/assets/images/modal_headers/SurfaceTransfer.png';
import Button from '~/components/ButtonAlt';
import ButtonRounded from '~/components/ButtonRounded';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  UnplanBuildingIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  NewCoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  PlanBuildingIcon,
  LocationPinIcon,
  PlusIcon,
  ResourceIcon,
  SurfaceTransferIcon,
  TimerIcon,
  WarningOutlineIcon
} from '~/components/Icons';
import Poppable from '~/components/Popper';
import SliderInput from '~/components/SliderInput';
import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import { useBuildingAssets, useResourceAssets } from '~/hooks/useAssets';
import useCrewContext from '~/hooks/useCrewContext';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { getCrewAbilityBonus } from '~/lib/utils';

import {
  CoreSampleSelection,
  DestinationSelection,

  BuildingPlanSection,
  BuildingRequirementsSection,
  DeconstructionMaterialsSection,
  DestinationPlotSection,
  ExistingSampleSection,
  ExtractionAmountSection,
  ExtractSampleSection,
  ItemSelectionSection,
  RawMaterialSection,
  ToolSection,

  ActionDialogFooter,
  ActionDialogHeader,
  ActionDialogStats,
  ActionDialogTimers,

  getBonusDirection,
  ActionDialogLoader,
} from './components';

const UnplanBuilding = ({ asteroid, plot, ...props }) => {
  const buildings = useBuildingAssets();
  const { constructionStatus, unplanConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  const { captain } = useCrewContext();

  useEffect(() => {
    if (constructionStatus === 'READY_TO_PLAN') {
      props.onClose();
    }
  }, [constructionStatus]);

  // handle auto-closing
  const lastStatus = useRef();
  useEffect(() => {
    // (always close if not)
    if (!['PLANNED', 'CANCELING'].includes(constructionStatus)) {
      props.onClose();
    }
    // (close on status change from)
    else if (['PLANNED'].includes(lastStatus.current)) {
      if (constructionStatus !== lastStatus.current) {
        props.onClose();
      }
    }
    lastStatus.current = constructionStatus;
  }, [constructionStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <UnplanBuildingIcon />,
          headerBackground: constructionBackground,
          label: 'Unplan Building Site',
        }}
        status="BEFORE"
        {...props} />

      <BuildingPlanSection
        building={buildings[plot?.building?.capableType]}
        canceling
        status={constructionStatus === 'PLANNING' ? 'DURING' : 'BEFORE'} />

      <ActionDialogTimers crewAvailableIn={0} actionReadyIn={0} />

      <ActionDialogFooter
        {...props}
        buttonsLoading={constructionStatus === 'CANCELING'}
        goLabel="Unplan Site"
        onGo={unplanConstruction}
        status={constructionStatus === 'CANCELING' ? 'DURING' : 'BEFORE'} />
    </>
  );
};

export default UnplanBuilding;