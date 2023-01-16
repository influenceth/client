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
import CrewCard from '~/components/CrewCard';
import Dialog from '~/components/Dialog';
import Dropdown from '~/components/Dropdown';
import IconButton from '~/components/IconButton';
import {
  CancelBlueprintIcon,
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  ConstructIcon,
  CoreSampleIcon,
  CrewIcon,
  DeconstructIcon,
  ExtractionIcon,
  ImproveCoreSampleIcon,
  LayBlueprintIcon,
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
import useCrew from '~/hooks/useCrew';
import useStore from '~/hooks/useStore';
import theme from '~/theme';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import useConstructionManager from '~/hooks/useConstructionManager';
import useInterval from '~/hooks/useInterval';
import { getCrewAbilityBonus } from '~/lib/utils';

import {
  BlueprintSelection,
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

const UnplanConstruction = ({ asteroid, plot, ...props }) => {
  const buildings = useBuildingAssets();
  const { constructionStatus, unplanConstruction } = useConstructionManager(asteroid?.i, plot?.i);
  const { captain } = useCrew();

  useEffect(() => {
    if (constructionStatus === 'READY_TO_PLAN') {
      props.onClose();
    }
  }, [constructionStatus]);

  return (
    <>
      <ActionDialogHeader
        asteroid={asteroid}
        captain={captain}
        plot={plot}
        action={{
          actionIcon: <CancelBlueprintIcon />,
          headerBackground: constructionBackground,
          label: 'Cancel Building Site',
        }}
        status="BEFORE"
        {...props} />

      <BuildingPlanSection
        building={buildings[plot?.building?.assetId]}
        canceling
        status={constructionStatus === 'PLANNING' ? 'DURING' : 'BEFORE'} />

      <ActionDialogTimers crewAvailableIn={0} actionReadyIn={0} />

      <ActionDialogFooter
        {...props}
        buttonsLoading={constructionStatus === 'CANCELING'}
        goLabel="Abandon Site Plan"
        onGo={unplanConstruction}
        status={constructionStatus === 'CANCELING' ? 'DURING' : 'BEFORE'} />
    </>
  );
};

export default UnplanConstruction;