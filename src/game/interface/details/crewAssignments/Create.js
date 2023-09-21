import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import styled, { css, keyframes } from 'styled-components';
import { Crewmate, Entity } from '@influenceth/sdk';
import {
  BiMinus as LockedIcon,
  BiRedo as RedoIcon,
  BiUndo as UndoIcon,

} from 'react-icons/bi';
import {
  VscTriangleLeft as LeftArrowIcon,
  VscTriangleRight as RightArrowIcon,

} from 'react-icons/vsc';
import LoadingAnimation from 'react-spinners/PuffLoader';
import { cloneDeep } from 'lodash';

import Collection1 from '~/assets/images/crew_collections/1.png';
import Collection2 from '~/assets/images/crew_collections/2.png';
import Collection3 from '~/assets/images/crew_collections/3.png';
import Collection4 from '~/assets/images/crew_collections/4.png';
import Button from '~/components/ButtonAlt';
import ConfirmationDialog from '~/components/ConfirmationDialog';
import CopyReferralLink from '~/components/CopyReferralLink';
import CrewCard from '~/components/CrewCard';
import CrewClassIcon from '~/components/CrewClassIcon';
import CrewTraitIcon from '~/components/CrewTraitIcon';
import Details from '~/components/DetailsModal';
import Ether from '~/components/Ether';
import { CheckIcon, CloseIcon, LinkIcon, TwitterIcon } from '~/components/Icons';
import IconButton from '~/components/IconButton';
import TextInput from '~/components/TextInput';
import TriangleTip from '~/components/TriangleTip';
import useAuth from '~/hooks/useAuth';
import useBookSession, { bookIds } from '~/hooks/useBookSession';
import useCrewManager from '~/hooks/useCrewManager';
import useCrewContext from '~/hooks/useCrewContext';
import useNameAvailability from '~/hooks/useNameAvailability';
import usePriceConstants from '~/hooks/usePriceConstants';
import formatters from '~/lib/formatters';
import MouseoverInfoPane from '~/components/MouseoverInfoPane';
import theme from '~/theme';
import useStore from '~/hooks/useStore';

const CollectionImages = {
  1: Collection1,
  2: Collection2,
  3: Collection3,
  4: Collection4,
};

const blinkingBackground = (p) => keyframes`
  0% {
    background-color: #000;
  }
  50% {
    background-color: rgba(${p.theme.colors.mainRGB}, 0.2);
  }
  100% {
    background-color: #000;
  }
`;

const slideOutTransition = keyframes`
  0% {
    color: transparent;
    transform: scaleX(0);
  }
  50% {
    color: transparent;
    transform: scaleX(1);
  }
  100% {
    transform: scaleX(1);
  }
`;

// TODO: (for mobile)
// const mobileSlideOutTransition = keyframes`
//   0% {
//     transform: scaleX(0);
//   }
//   50% {
//     transform: scaleX(1);
//   }
//   100% {
//     transform: scaleX(1);
//   }
// `;

const opacityTransition = keyframes`
  0% { opacity: 0; }
  75% { opacity: 0; }
  100% { opacity: 1; }
`;

const TitleBox = styled.div`
  background: rgba(0, 0, 0, 0.8);
  margin: 25px 0;
  padding: 12px 0;
  position: relative;
  z-index: 1;
`;
const Title = styled.div`
  border: solid #444;
  border-width: 1px 0;
  color: white;
  display: flex;
  font-size: 32px;
  font-weight: light;
  line-height: 40px;
  justify-content: center;
  margin: 0 auto;
  overflow: visible;
  padding: 24px 0;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  width: calc(100% - 180px);

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    white-space: normal;
  }
`;

const ImageryContainer = styled.div`
  display: flex;
  flex: 0 1 calc(100% - 80px);
  overflow: auto;
  padding: 60px 0 0;
  position: relative;

  & > div:first-child {
    background-image: url(${p => p.src});
    background-repeat: no-repeat;
    background-position: center center;
    background-size: cover;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1;
    opacity: 0.5;
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, rgba(0,0,0,0.7) 50%, transparent 100%);
    transition: opacity 750ms ease-out, background-image 750ms ease-out;
  }

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding-top: 15px;
  }
`;

const borderColor = '#333';
const cardWidth = 320;
const centerWidth = 375;
const traitHeight = 100;
const traitHeight_big = 112;
const traitTriangleWidth = 30;
const traitBackground = 'rgba(25,25,25,0.95)';
const traitBorder = '#444';

const MainContent = styled.div`
  height: 100%;
  position: relative;
  width: 100%;
`;

const CenterColumn = styled.div`
  background: black;
  border: solid ${borderColor};
  border-width: 0 1px;
  display: flex;
  flex-direction: column;
  height: 100%;
  margin: 0 auto;
  padding: 15px 0 30px;
  position: relative;
  width: ${centerWidth}px;
  z-index: 200;
`;

const CardWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 10px 15px 15px;
  justify-content: center;
  width: 100%;
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 20px 0;
  }
`;

const CardContainer = styled.div`
  background: black;
  z-index: 3;
  & > div {
    border: 1px solid ${borderColor};
    padding: 10px;
    width: ${cardWidth}px;
    @media (min-width: 1024px) {
      max-width: 22vw;
    }
  }
`;

const Traits = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  z-index: 2;

  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    display: none;
  }
`;

const TipIcon = styled.div`
  position: absolute;
  ${p => p.side}: -16px;
  margin-top: 8px;
  & > * { display: none; }
`;
const ClickableIcon = styled.div``;
const AtRiskIcon = styled.div`color: ${p => p.theme.colors.error};`;
const UnclickableIcon = styled.div`color: #777;`;
const TipHolder = styled.div`
  position: absolute;
  top: 0;
  & > svg {
    height: ${traitTriangleWidth}px;
    width: ${traitHeight - 1}px;
    & > polygon {
      fill: ${traitBackground};

      transition: 250ms ease-out;
      transition-property: fill;
    }
    & > path {
      stroke: ${traitBorder};

      transition: 250ms ease-out;
      transition-property: stroke;
    }
  }
`;

const attentionBackground = keyframes`
  0% { background-color: #005678; }
  50% { background-color: #14262d; }
  100% { background-color: #005678; }
`;
const attentionFill = keyframes`
  0% { fill: #005678; }
  50% { fill: #14262d; }
  100% { fill: #005678; }
`;

const Trait = styled.div`
  position: relative;
  border: solid ${traitBorder};
  border-width: 1px 0;
  flex: 1;
  display: flex;
  flex-direction: row;
  align-items: center;

  transition: 250ms ease-out;
  transition-property: background, border-color;

  & > *:first-child {
    ${p => p.side === 'right' && 'margin-left: 20px;'}
    font-size: 65px;
    line-height: 65px;
    position: relative;
    text-align: center;
    width: 75px;
    z-index: 3;
  }
  & > article {
    flex: 1;
    max-height: 100%;
    overflow: hidden;
    padding-bottom: 10px;
    padding-left: 10px;
    padding-top: 10px;
    ${p => p.side === 'left' && 'padding-right: 15px;'}
    & > h4 {
      font-size: 17px;
      margin: 0 0 4px;
    }
    & > div {
      color: ${p => p.type === 'impactful' ? p.theme.colors.main : '#888'};
    }
  }

  & ${TipHolder} {
    ${p => p.side}: 0;
    & > svg {
      transform-origin: top ${p => p.side};
    }
  }

  @media (max-width: 1500px) {
    & > *:first-child {
      width: 72px;
    }
    & > article {
      font-size: 90%;
    }
  }
  @media (min-width: 1024px) and (max-width: 1400px) {
    & > *:first-child {
      display: none;
    }
    & > article {
      padding-left: 20px;
    }
  }

  ${p => {
    if (p.isAtRisk && !p.isEmpty) {
      return `
        background: #4b1e1a;
        border-color: #444;
        & > article > h4 {
          color: ${p.theme.colors.error};
        }
        & ${TipHolder} {
          & > svg {
            & > polygon {
              fill: #4b1e1a;
            }
            & > path {
              stroke: #444;
            }
          }
          ${TipIcon} > ${AtRiskIcon} { display: block; }
        }
      `;
    } else if (p.isClickable && !p.isAtRisk) {
      const clickable = css`
        border-color: rgba(${p.theme.colors.mainRGB}, 0.5);
        cursor: ${p.theme.cursors.active};
        & ${TipHolder} {
          & > svg > path {
            stroke: rgba(${p.theme.colors.mainRGB}, 0.5);
          }
          ${TipIcon} > ${ClickableIcon} { display: block; }
        }
      `;
      const clickableHover = css`
        background: #005678;
        & ${TipHolder} > svg > polygon {
          fill: #005678;
        }
      `;
      if (p.isEmpty && !p.isToggling) {
        return css`
          ${clickable}
          animation: ${attentionBackground} 2000ms ease infinite;
          background: #005678;
          & > article > h4 {
            color: ${p.theme.colors.main} !important;
            font-size: 17px !important;
            margin: 0;
            padding: 0;
            text-transform: none;
          }
          & > article > div { display: none; }
          & ${TipHolder} > svg {
            & > polygon {
              animation: ${attentionFill} 2000ms ease infinite;
              fill: #005678;
            }
          }

          &:hover {
            ${clickableHover}
            animation: none;
            & ${TipHolder} > svg > polygon { animation: none; }
          }
        `;
      }
      return css`
        ${clickable}
        &:hover {
          ${clickableHover}
        }
        ${p => p.isToggling && `
          &:not(:hover) {
            background: #003447;
            & ${TipHolder} > svg > polygon {
              fill: #003447;
            }
          }
        `}
      `;
    }
    return `
      & ${TipHolder} ${TipIcon} > ${UnclickableIcon} { display: block; }
    `; 
  }}
`;

const TraitSpacer = styled.div`
  border: solid ${traitBorder};
  border-width: 1px 0;
  max-width: 22vw;
  width: ${centerWidth}px; // (should match card width)
`;

const TraitRow = styled.div`
  background: ${traitBackground};
  display: flex;
  flex-direction: row;
  height: ${traitHeight}px;
  margin-bottom: 8px;
  overflow: visible;
  transform: scaleX(0);
  width: calc(85% - ${traitTriangleWidth * 2}px);

  &:nth-child(1) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 500ms;
  }
  &:nth-child(2) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 650ms;
  }
  &:nth-child(3) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 800ms;
  }
  &:nth-child(4) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 950ms;
  }
  &:nth-child(5) {
    animation: ${slideOutTransition} 1000ms normal forwards ease-out 1100ms;
  }

  ${p => p.big && `
    height: ${traitHeight_big}px;
    width: calc(97% - ${traitTriangleWidth * 2}px);
    ${TipHolder} {
      & > svg {
        width: ${traitHeight_big - 1}px;
      }
      ${TipIcon} {
        margin-top: 14px;
      }
    }
    margin-bottom: 60px;

    ${Trait} > article {
      text-transform: uppercase;
      & > h4 {
        color: #777;
        font-size: 15px;
      }
      & > div {
        color: white;
        font-size: 17px;
        font-weight: bold;
        opacity: 1;
      }
    }
  `}
`;

const NameSection = styled.div`
  align-items: center;
  animation: ${opacityTransition} 1000ms normal forwards ease-out 650ms;
  flex: 1;
  opacity: 0;
  display: flex;
  margin-top: 5px;
  flex-direction: column;
  & > input {
    &:not(:disabled) {
      animation: ${blinkingBackground} 750ms linear 2000ms 2;
    }
    background: #000;
    border: 1px solid rgba(${p => p.theme.colors.mainRGB}, 0.8);
    font-size: 20px;
    height: 40px;
    text-align: center;
    width: 275px;
  }
  & > label {
    color: #777;
    display: block;
    font-weight: bold;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
`;

const RandomizeControls = styled(IconButton)`
  margin-right: 0;
  border: 0;
`;

const RandomizeButton = styled(Button)`
  margin: 0 8px;
`;

const RerollContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  margin-top: 10px;
`;

const PromptBody = styled.div`
  border: solid #333;
  border-width: 1px 0;
  color: ${p => p.highlight ? p.theme.colors.main : '#AAA'};
  line-height: 20px;
  padding: 16px 24px;
  & b {
    color: white;
    font-weight: normal;
  }
  @media (max-width: ${p => p.theme.breakpoints.mobile}px) {
    padding: 12px;
  }

  & h4 {
    color: ${p => p.theme.colors.success};
    font-weight: normal;
    margin-bottom: 0;
    text-align: right;
  }
`;

const Rule = styled.div`
  height: 0;
  border-bottom: 1px solid #333;
`;

const Footer = styled.div`
  background: black;
  padding: 0 35px;
  height: 80px;
`;

const RecruitTally = styled.div`
  color: ${p => p.theme.colors.main};
  margin-right: 16px;
  & b {
    color: white;
    font-weight: normal;
  }
`;

const CollectionImage = styled.div`
  align-items: center;
  display: flex;
  height: 1em;
  justify-content: center;
  overflow: visible;
  width: 1em;
  &:before {
    content: "";
    display: block;
    background-image: url(${p => CollectionImages[p.coll]});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center center;
    position: absolute;
    height: ${p => p.coll === 4 ? '175%' : '130%'};
    width: ${p => p.coll === 4 ? '175%' : '130%'};
  }
`;

const MouseoverContent = styled.div`
  padding: 15px;
`;
const MouseoverTitle = styled.div`
  border-bottom: 1px solid #333;
  color: white;
  font-size: 18px;
  margin: 0 0 8px;
  padding: 0 0 8px;
`;
const MouseoverSubtitle = styled.div`
  color: white;
  font-size: 14px;
  margin: 15px 0 5px;
  text-transform: uppercase;
`;
const MouseoverHighlightTitle = styled(MouseoverTitle)`
  color: ${p => p.theme.colors.main};
  font-size: 15px;
  font-weight: bold;
  text-transform: uppercase;
`;
const MouseoverDescription = styled.div`
  color: #999;
  font-size: 85%;
`;

const TraitSelectionArea = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const SelectableTrait = styled.div`
  align-items: center;
  border: 1px solid transparent;
  color: white;
  cursor: ${p => p.theme.cursors.active};
  display: flex;
  justify-content: center;
  font-size: 54px;
  height: 58px;
  margin: 1px;
  width: 58px;
  ${p => p.isSelected && `
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
  `}

  &:hover {
    background: rgba(${p => p.theme.colors.mainRGB}, 0.3);
    border-color: rgba(${p => p.theme.colors.mainRGB}, 0.2);
  }
`;

const ClassSelectionArea = styled(TraitSelectionArea)``;
const SelectableClass = styled(SelectableTrait)`
  font-size: 48px;
`;

const mouseoverPaneProps = (visible, isEditor) => ({
  css: css`
    padding: 0;
    pointer-events: ${visible ? 'auto' : 'none'};
    width: 400px;
    ${isEditor ? `border-color: rgba(${theme.colors.mainRGB}, 0.5);` : ''}
  `,
  placement: 'top',
  visible
});

const onCloseDestination = `/crew`;

const noop = () => {};

const getRandomAdalianAppearance = () => {
  const gender = Math.ceil(Math.random() * 2);
  const faces = gender === 1 ? [0, 1, 3, 4, 5, 6, 7] : [0, 1, 2];
  const hairs = gender === 1 ? [0, 1, 2, 3, 4, 5] : [0, 6, 7, 8, 9, 10, 11];
  return {
    gender,
    body: (gender - 1) * 6 + Math.ceil(Math.random() * 6),
    face: faces[Math.floor(Math.random() * faces.length)],
    hair: hairs[Math.floor(Math.random() * hairs.length)],
    hairColor: Math.ceil(Math.random() * 5),
    // clothes: 31 + (crewClass - 1) * 2 + Math.ceil(Math.random() * 2),
    clothesOffset: 31 + Math.ceil(Math.random() * 2),
    head: 0,
    item: 0
  };
};

const PopperWrapper = (props) => {
  const [refEl, setRefEl] = useState();
  return props.children(refEl, setRefEl);
}

const MouseoverInfoContent = ({ title, description }) => (
  <MouseoverContent>
    <MouseoverTitle>{title}</MouseoverTitle>
    <MouseoverDescription>{description}</MouseoverDescription>
  </MouseoverContent>
);

const ClassSelector = ({ classObjects, crewmate, onUpdateClass }) => {
  const [hovered, setHovered] = useState();

  const classDisplay = useMemo(() => classObjects[hovered || crewmate?.Crewmate?.class], [hovered, crewmate?.Crewmate?.class])

  return (
    <MouseoverContent>
      <MouseoverHighlightTitle>Select Class</MouseoverHighlightTitle>
      <ClassSelectionArea>
        {Object.values(Crewmate.CLASS_IDS).map((classId) => (
          <SelectableClass
            key={classId}
            isSelected={crewmate?.Crewmate?.class === classId}
            onClick={() => onUpdateClass(classId)}
            onMouseEnter={() => setHovered(classId)}
            onMouseLeave={() => setHovered()}>
            <CrewClassIcon crewClass={classId} />
          </SelectableClass>
        ))}
      </ClassSelectionArea>

      <div style={{ height: 180, marginTop: 15, overflow: 'hidden' }}>
        <MouseoverTitle>{classDisplay?.name || '‎'}</MouseoverTitle>
        <MouseoverDescription>{classDisplay?.description || '(Select a class above)'}</MouseoverDescription>

        {classDisplay && (
          <>
            <MouseoverSubtitle>{classDisplay?.name} Bonuses</MouseoverSubtitle>
            <MouseoverDescription>{classDisplay?.abilities}</MouseoverDescription>
          </>
        )}
      </div>
    </MouseoverContent>
  );
};

const TraitSelector = ({ crewmate, currentTraits, onUpdateTraits, traitIndex }) => {
  const changeTrait = currentTraits[traitIndex];
  const priorTraits = currentTraits.slice(0, traitIndex).map((t) => t.id);
  const options = useMemo(() => {
    return Crewmate.nextTraits(
      crewmate.Crewmate.coll,
      crewmate.Crewmate.class,
      priorTraits
    ).sort((a, b) => Crewmate.TRAITS[a].name < Crewmate.TRAITS[b].name ? -1 : 1);
  }, [priorTraits]);

  const [hovered, setHovered] = useState();

  const onSelect = useCallback((newTrait) => {
    onUpdateTraits(changeTrait?.id === newTrait ? currentTraits.map((t) => t.id) : [...priorTraits, newTrait]);
  }, [changeTrait, priorTraits]);

  const traitDisplay = useMemo(() => Crewmate.TRAITS[hovered || changeTrait?.id], [hovered, changeTrait])

  return (
    <MouseoverContent>
      <MouseoverHighlightTitle>Available Traits</MouseoverHighlightTitle>
      <TraitSelectionArea>
        {options.map((t) => (
          <SelectableTrait
            key={t}
            isSelected={changeTrait?.id === t}
            onClick={() => onSelect(t)}
            onMouseEnter={() => setHovered(t)}
            onMouseLeave={() => setHovered()}>
            <CrewTraitIcon trait={t} />
          </SelectableTrait>
        ))}
      </TraitSelectionArea>

      <div style={{ height: 105, marginTop: 15, overflow: 'hidden' }}>
        <MouseoverTitle>{traitDisplay?.name || '‎'}</MouseoverTitle>
        <MouseoverDescription>{traitDisplay?.description || '(Select a trait above)'}</MouseoverDescription>
      </div>
    </MouseoverContent>
  );
};

const CrewAssignmentCreate = ({ backLocation, bookSessionHook, crewId, crewmateId, locationId, ...props }) => {
  const { account } = useAuth();
  const history = useHistory();

  const dispatchCrewAssignmentRestart = useStore((s) => s.dispatchCrewAssignmentRestart);

  const { bookError, bookSession, storySession, undoPath, restart } = bookSessionHook;
  const isNameValid = useNameAvailability(Entity.IDS.CREWMATE);
  const { purchaseAndOrInitializeCrew, getPendingCrewmate, adalianRecruits, arvadianRecruits } = useCrewManager();
  const { crew, crewmateMap } = useCrewContext();
  const { data: priceConstants } = usePriceConstants();

  const [confirming, setConfirming] = useState();
  const [confirmingUnlock, setConfirmingUnlock] = useState();
  const [hovered, setHovered] = useState();

  const [appearanceOptions, setAppearanceOptions] = useState([]);
  const [appearanceSelection, setAppearanceSelection] = useState();

  const [toggling, setToggling] = useState();

  const [selectedTraits, setSelectedTraits] = useState(bookSession?.selectedTraits || []);
  const [traitsLocked, setTraitsLocked] = useState(!!bookSession.isComplete);

  const [finalizing, setFinalizing] = useState();
  const [finalized, setFinalized] = useState();
  const [name, setName] = useState('');

  const pendingCrewmate = useMemo(() => getPendingCrewmate(), [getPendingCrewmate]);
  const [selectedClass, setSelectedClass] = useState(
    pendingCrewmate?.Crewmate?.class
    || bookSession?.crewmate?.Crewmate?.class
    || bookSession?.selectedClass
  );

  useEffect(() => {
    if (bookError) history.push(onCloseDestination);
  }, [bookError, onCloseDestination]);

  // derive crewmate-structured crewmate based on selections
  const crewmate = useMemo(() => {

    // if already finalized, return final version
    if (finalized) return finalized;

    // if already pending, format from pending tx
    if (pendingCrewmate) {
      const { name, hair_color, caller_crew, crewmate, ...crewmateVars } = pendingCrewmate.vars;
      crewmateVars.coll = pendingCrewmate.key === 'RecruitAdalian' // TODO: also handle arvadians
        ? Crewmate.COLLECTION_IDS.ADALIAN
        : arvadianRecruits.find((r) => r.Crewmate.id === crewmateVars.Crewmate.id)?.Crewmate?.coll;
      crewmateVars.hairColor = hair_color;
      crewmateVars.appearance = Crewmate.packAppearance(crewmateVars);
      return {
        ...crewmate, // (id, label)
        Control: {
          controller: {
            id: caller_crew,
            label: Entity.IDS.CREW,
          }
        },
        Crewmate: {
          ...crewmateVars
        },
        Name: { name },
        _finalizing: true
      };
    }

    // if get here, there must be a bookSession...
    if (!bookSession) return null;

    // default from bookSession crewmate (arvadian) or from empty adalian
    const c = cloneDeep(bookSession.crewmate) || {
      id: 0,
      label: Entity.IDS.CREWMATE,
      Crewmate: {
        coll: Crewmate.COLLECTION_IDS.ADALIAN
      }
    };

    if (c.id === 0) { // TODO: remove this
      console.warn('OVERRIDING ID -- should not need to do this');
      c.id = adalianRecruits?.[0]?.id || 0;
    }

    // force control to the specified crew
    // TODO: should we validate this?
    c.Control = {
      controller: {
        id: crewId,
        label: Entity.IDS.CREW,
      }
    }

    // initialize things if not set
    if (!c.Crewmate.coll) {
      console.warn('OVERRIDING COLL -- This should not happen');
      c.Crewmate.coll = bookSession.bookId === bookIds.ADALIAN_RECRUITMENT ? Crewmate.COLLECTION_IDS.ADALIAN : Crewmate.COLLECTION_IDS.ARVAD_CITIZEN;
    }
    if (!c.Crewmate.class) {
      c.Crewmate.class = selectedClass;
      c._canReclass = true;
    }
    console.log('- - - - name', name, c.Name?.name);
    if (!c.Name?.name) {
      c.Name = { name };
      c._canRename = true;
    }

    // split traits selected
    if (selectedTraits) {
      c.Crewmate.cosmetic = selectedTraits.filter((t) => Crewmate.TRAITS[t]?.type === Crewmate.TRAIT_TYPES.COSMETIC);
      c.Crewmate.impactful = selectedTraits.filter((t) => Crewmate.TRAITS[t]?.type === Crewmate.TRAIT_TYPES.IMPACTFUL);
    }

    // get appearance
    if (!c.Crewmate.appearance) {
      if (appearanceOptions.length) {
        const { clothesOffset, ...appearance } = appearanceOptions[appearanceSelection];
        c.Crewmate.appearance = Crewmate.packAppearance({
          ...appearance,
          clothes: c.Crewmate.class ? (c.Crewmate.class - 1) * 2 + clothesOffset : 18
        });
      }
      c._canRerollAppearance = true;
    }

    // if crew is 0, use location; else, use crew location
    if (crewId === 0) {
      c.Location = { id: locationId, label: Entity.IDS.BUILDING };
    } else if (crew?._location) {
      c.Location = { id: crew._location.buildingId, label: Entity.IDS.BUILDING };
    }

    return c;
  }, [
    appearanceOptions,
    appearanceSelection,
    crewId,
    crew?._location,
    locationId,
    name,
    pendingCrewmate,
    selectedClass,
    selectedTraits,
    bookSession
  ]);
  
  const traitTally = crewmate.Crewmate.coll === Crewmate.COLLECTION_IDS.ADALIAN ? 4 : 8;

  // init appearance options as desired
  useEffect(() => {
    if (crewmate && !crewmate.Crewmate.appearance && appearanceOptions?.length === 0) {
      setAppearanceOptions([getRandomAdalianAppearance()]);
      setAppearanceSelection(0);
    }
  }, [!!crewmate, appearanceOptions?.length]);

  // handle finalizing
  useEffect(() => {
    if (crewmate?._finalizing) setFinalizing(true);
  }, [crewmate?._finalizing]);

  // handle finalized
  useEffect(() => {
    console.log('finalizing', finalizing, );
    if (finalizing) {
      const finalizedCrewmate = Object.values(crewmateMap).find((c) => c.Name.name === name);
      if (finalizedCrewmate) {
        setFinalizing(false);
        setFinalized(finalizedCrewmate);

        // clear session data
        dispatchCrewAssignmentRestart(finalizedCrewmate?.Control?.controller?.id, finalizedCrewmate?.id);
        if (crewmateId !== finalizedCrewmate?.id) {
          dispatchCrewAssignmentRestart(finalizedCrewmate?.Control?.controller?.id, crewmateId);
        }
      }
      // TODO (enhancement): after timeout, show error
    }
  }, [ crewmateId, crewmateMap, finalizing ]);

  const shareOnTwitter = useCallback(() => {
    // TODO: ...
    const params = new URLSearchParams({
      text: [
        `I just minted an Adalian Citizen.`,
        `Be one of the first to join @influenceth and explore Adalia today!`,
        `Join Now:`,
      ].join('\n\n'),
      hashtags: 'PlayToEarn,NFTGaming',
      url: `${document.location.origin}/play/crew-assignment/?r=${account}`,
      //via: 'influenceth'
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, '_blank');
  }, [account]);

  const handleFinish = useCallback(() => {
    history.push(onCloseDestination);
  }, [history]);

  const handleNameChange = useCallback((newName) => {
    setName(newName);
  }, []);

  const rerollAppearance = useCallback(async () => {
    setAppearanceOptions((prevValue) => {
      setAppearanceSelection((prevValue || []).length);
      return [...(prevValue || []), getRandomAdalianAppearance()]
    });
  }, []);

  const rollBackAppearance = useCallback(() => {
    setAppearanceSelection(Math.max(0, appearanceSelection - 1));
  }, [appearanceSelection]);

  const rollForwardAppearance = useCallback(() => {
    setAppearanceSelection(Math.min(appearanceOptions.length - 1, appearanceSelection + 1));
  }, [appearanceOptions.length, appearanceSelection]);

  const rerollTraits = useCallback(async () => {
    const c = cloneDeep(crewmate);
    if (!c?.Crewmate?.coll) return;

    // get random class if one is not yet selected
    if (!c.Crewmate.class) {
      c.Crewmate.class = Object.values(Crewmate.CLASS_IDS)[Math.floor(Math.random() * Object.values(Crewmate.CLASS_IDS).length)];
      setSelectedClass(c.Crewmate.class);
    }

    // if full, clear and randomize (else, fill in from current state)
    const traits = (selectedTraits?.length === traitTally ? [] : selectedTraits);
    let possibleTraits = Crewmate.nextTraits(c.Crewmate.coll, c.Crewmate.class, traits);
    let randomIndex;
    while (possibleTraits.length > 0 && traits.length < 12) {
      randomIndex = Math.floor(Math.random() * possibleTraits.length);
      traits.push(possibleTraits[randomIndex]);
      possibleTraits = Crewmate.nextTraits(c.Crewmate.coll, c.Crewmate.class, traits);
    }

    // set new traits
    setSelectedTraits(traits);
  }, [crewmate?.Crewmate?.class, selectedTraits, traitTally]);

  const confirmFinalize = useCallback(async () => {
    if (await isNameValid(name)) {
      setConfirming(true);
    }
  }, [isNameValid, name]);

  const finalize = useCallback(() => {
    setConfirming(false);
    purchaseAndOrInitializeCrew({ crewmate });
  }, [crewmate, purchaseAndOrInitializeCrew]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    history.push(backLocation);
  }, [backLocation]);

  // show "complete" page (instead of "create") for non-recruitment assignments
  useEffect(() => {
    if (bookSession && !bookSession.isMintingStory) {
      history.push(`/crew-assignment/${crewmateId}/complete`);
    }
  }, [!!bookSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // place mouseovers after animation complete
  const [animationComplete, setAnimationComplete] = useState();
  useEffect(() => {
    if (!!crewmate) {
      const to = setTimeout(() => {
        setAnimationComplete(true);
      }, 2500);
      return () => {
        if (to) clearTimeout(to);
      }
    }
  }, [!!crewmate]);

  const onUpdateClass = useCallback((newClass) => {
    if (selectedClass !== newClass) {
      setSelectedTraits([]);
    }
    setSelectedClass(newClass);
    setToggling();
  }, [selectedTraits]);

  const onUpdateTraits = useCallback((newTraits) => {
    setSelectedTraits(newTraits);
    setToggling();
  }, [selectedTraits]);

  const traitObjects = useMemo(() => {
    return (selectedTraits || []).map((id) => ({ id, ...Crewmate.TRAITS[id] }));
  }, [selectedTraits, selectedTraits?.length]);
  // TODO: above was not triggering on first click of "randomize" without the length dependency added?

  const classObjects = useMemo(() => {
    return Object.values(Crewmate.CLASS_IDS).reduce((acc, id) => ({
      ...acc,
      [id]: {
        id,
        abilities: Object.values(Crewmate.ABILITY_TYPES)
          .filter((a) => a.class === id)
          .map((a) => <div key={a.name}>- {a.name}</div>),
        ...Crewmate.getClass(id),
      }
    }), {});
  }, []);

  const recruitTally = useMemo(() => {
    return (adalianRecruits?.length || 0) + (arvadianRecruits?.length || 0);
  }, [adalianRecruits, arvadianRecruits]);

  return (
    <>
      <ImageryContainer src={storySession.completionImage || storySession.image}>
        <div />
        <MainContent>
          {!finalized && (
            <>
              <CenterColumn>
                <CardWrapper>
                  <CardContainer>
                    <div>
                      <CrewCard
                        crewmate={crewmate}
                        fontSize="25px"
                        hideCollectionInHeader
                        hideFooter
                        hideIfNoName
                        hideMask
                        noWrapName={finalized}
                        showClassInHeader={finalized} />
                    </div>
                  </CardContainer>
                </CardWrapper>

                {!pendingCrewmate && (
                  <>
                    <NameSection>
                      {crewmate._canRename && (
                        <>
                          <label>Crewmate Name</label>
                          {/* TODO: implement naming rules from sdk */}
                          <TextInput
                            disabled={finalizing || !crewmate._canRename}
                            initialValue={name}
                            maxlength={31}
                            onChange={handleNameChange}
                            pattern="^([a-zA-Z0-9]+\s)*[a-zA-Z0-9]+$"
                            placeholder="Enter Name" />
                        </>
                      )}

                      <div style={{ flex: 1 }} />

                      {crewmate._canRerollAppearance && (
                        <RerollContainer>
                          <RandomizeControls
                            onClick={rollBackAppearance}
                            disabled={finalizing || appearanceSelection === 0}
                            style={{ opacity: appearanceOptions.length > 1 ? 1 : 0 }}>
                            <UndoIcon />
                          </RandomizeControls>

                          <RandomizeButton
                            disabled={finalizing}
                            lessTransparent
                            onClick={rerollAppearance}
                            style={{ width: 275 }}
                            subtle>
                            Randomize Appearance
                          </RandomizeButton>

                          <RandomizeControls
                            onClick={rollForwardAppearance}
                            disabled={finalizing || appearanceSelection === appearanceOptions.length - 1}
                            style={{ opacity: appearanceOptions.length > 1 ? 1 : 0 }}>
                            <RedoIcon />
                          </RandomizeControls>
                        </RerollContainer>
                      )}

                      
                      <RerollContainer>
                        {traitsLocked
                          ? (
                            <RandomizeButton
                              disabled={finalizing}
                              lessTransparent
                              onClick={() => setConfirmingUnlock(true)}
                              style={{ width: 275 }}
                              subtle>
                              Unlock Traits
                            </RandomizeButton>
                          )
                          : (
                            <>
                              <RandomizeButton
                                disabled={finalizing}
                                lessTransparent
                                onClick={rerollTraits}
                                style={{ width: 275 }}
                                subtle>
                                Randomize Traits
                              </RandomizeButton>
                            </>
                          )
                        }
                      </RerollContainer>
                      
                      {/* TODO: _canRerollTraits, _canUnlockTraits */}

                    </NameSection>
                  </>
                )}
              </CenterColumn>

              <Traits>
                <TraitRow big>
                  <Trait side="left">
                    <div>
                      <CollectionImage coll={crewmate.Crewmate.coll} />
                    </div>
                    <article>
                      <h4>Collection</h4>
                      <div>{Crewmate.getCollection(crewmate.Crewmate.coll)?.name}</div>
                    </article>
                    <TipHolder>
                      <TriangleTip strokeWidth="1" rotate="90" />
                      <TipIcon side="left">
                        <UnclickableIcon><LockedIcon /></UnclickableIcon>
                      </TipIcon>
                    </TipHolder>
                  </Trait>

                  <TraitSpacer />

                  <PopperWrapper>
                    {(refEl, setRefEl) => (
                      <>
                        <Trait
                          ref={animationComplete ? setRefEl : noop}
                          onClick={(pendingCrewmate || traitsLocked || !crewmate._canReclass) ? noop : () => setToggling('class')}
                          onMouseEnter={animationComplete ? () => setHovered('class') : noop}
                          onMouseLeave={() => setHovered()}
                          side="right"
                          isClickable={!traitsLocked && crewmate._canReclass}
                          isToggling={toggling === 'class'}
                          isEmpty={!crewmate.Crewmate.class}>
                          <div>
                            <CrewClassIcon crewClass={crewmate.Crewmate.class} />
                          </div>
                          <article>
                            <h4>{crewmate.Crewmate.class ? 'Class' : 'Select Class'}</h4>
                            <div>{classObjects[crewmate.Crewmate.class]?.name}</div>
                          </article>
                          <TipHolder>
                            <TriangleTip strokeWidth="1" rotate="-90" />
                            <TipIcon side="right">
                              <ClickableIcon><RightArrowIcon /></ClickableIcon>
                              <UnclickableIcon><LockedIcon /></UnclickableIcon>
                            </TipIcon>
                          </TipHolder>
                        </Trait>

                        <MouseoverInfoPane referenceEl={refEl} {...mouseoverPaneProps(hovered === 'class' && crewmate.Crewmate.class && !toggling)}>
                          <MouseoverInfoContent
                            title={classObjects[crewmate.Crewmate.class]?.name}
                            description={(
                              <>
                                {classObjects[crewmate.Crewmate.class]?.description}
                                
                                <MouseoverSubtitle>{classObjects[crewmate.Crewmate.class]?.name} Bonuses</MouseoverSubtitle>
                                {classObjects[crewmate.Crewmate.class]?.abilities}
                              </>
                            )}
                          />
                        </MouseoverInfoPane>

                        <MouseoverInfoPane
                          referenceEl={refEl}
                          {...mouseoverPaneProps(toggling === 'class', true)}>
                          <ClassSelector
                            classObjects={classObjects}
                            crewmate={crewmate}
                            onUpdateClass={onUpdateClass} />
                        </MouseoverInfoPane>
                      </>
                    )}
                  </PopperWrapper>
                </TraitRow>

                {Array.from(Array(Math.ceil(traitTally / 2))).map((_, i) => {
                  return (
                    <TraitRow key={i}>
                      {Array.from(Array(2)).map((_, j) => {
                        const traitIndex = 2 * i + j;
                        const hoverKey = traitIndex;
                        const trait = traitObjects[traitIndex];
                        const side = j === 0 ? 'left' : 'right';
                        return (
                          <Fragment key={j}>
                            <PopperWrapper>
                              {(refEl, setRefEl) => (
                                <>
                                  <Trait
                                    ref={animationComplete ? setRefEl : noop}
                                    onClick={(pendingCrewmate || traitsLocked || traitIndex > selectedTraits?.length) ? noop : () => setToggling(hoverKey)}
                                    onMouseEnter={animationComplete ? () => setHovered(hoverKey) : noop}
                                    onMouseLeave={() => setHovered()}
                                    side={side}
                                    type={trait?.type}
                                    isClickable={!traitsLocked && crewmate.Crewmate.class && traitIndex <= selectedTraits?.length}
                                    isEmpty={!trait}
                                    isToggling={toggling === hoverKey}
                                    isAtRisk={toggling === 'class' || toggling < traitIndex}>
                                    <div>
                                      <CrewTraitIcon trait={trait?.id} type={trait?.type} hideFallback opaque />
                                    </div>
                                    <article>
                                      <h4>{trait?.name}</h4>
                                      {!trait?.name && crewmate.Crewmate.class && traitIndex === selectedTraits?.length && <h4>Select Trait</h4>}
                                      <div>{trait?.type && (trait?.type === 'impactful' ? 'Impactful' : 'Cosmetic')}</div>
                                    </article>
                                    <TipHolder>
                                      <TriangleTip strokeWidth="1" rotate={side === 'left' ? 90 : -90} />
                                      <TipIcon side={side}>
                                        <ClickableIcon>{side === 'left' ? <LeftArrowIcon /> : <RightArrowIcon />}</ClickableIcon>
                                        <UnclickableIcon><LockedIcon /></UnclickableIcon>
                                        <AtRiskIcon><CloseIcon /></AtRiskIcon>
                                      </TipIcon>
                                    </TipHolder>
                                  </Trait>

                                  <MouseoverInfoPane referenceEl={refEl} {...mouseoverPaneProps(hovered === hoverKey && trait && !toggling)}>
                                    <MouseoverInfoContent title={trait?.name} description={trait?.description} />
                                  </MouseoverInfoPane>

                                  <MouseoverInfoPane
                                    referenceEl={refEl}
                                    {...mouseoverPaneProps(toggling === hoverKey, true)}>
                                    <TraitSelector
                                      crewmate={crewmate}
                                      currentTraits={traitObjects}
                                      traitIndex={traitIndex}
                                      onUpdateTraits={onUpdateTraits} />
                                  </MouseoverInfoPane>
                                </>
                              )}
                            </PopperWrapper>
                            {side === 'left' && <TraitSpacer />}
                          </Fragment>
                        );
                      })}

                    </TraitRow>
                  );
                })}
              </Traits>
            </>
          )}

          {finalized && (
            <>
              <TitleBox>
                <Title>Crewmate Recruited</Title>
              </TitleBox>
              <div>
                <CardWrapper>
                  <CardContainer>
                    <div>
                      <CrewCard
                        crewmate={crewmate}
                        fontSize="25px"
                        noWrapName
                        showClassInHeader />
                    </div>
                  </CardContainer>
                </CardWrapper>

                {/* 
                <RecruitSection>
                  {!process.env.REACT_APP_HIDE_SOCIAL && (
                    <TwitterButton onClick={shareOnTwitter}>
                      <span>Share on Twitter</span>
                      <TwitterIcon />
                    </TwitterButton>
                  )}
                </RecruitSection>
                */}
              </div>
            </>
          )}
        </MainContent>
      </ImageryContainer>

      <Footer>
        <Rule />
        <div style={{ alignItems: 'center', display: 'flex', height: 'calc(100% - 1px)', width: '100%' }}>
          {finalized && (
            <>
              <CopyReferralLink>
                <Button subtle><LinkIcon /> <span style={{ marginLeft: 4 }}>Copy Referral Link</span></Button>
              </CopyReferralLink>
              
              <div style={{ flex: 1 }} />
              <Button subtle onClick={() => history.push('/crew')}>Go to Crew</Button>
            </>
          )}
          {!finalized && (
            <>
              <Button disabled={!!pendingCrewmate} subtle onClick={handleBack}>Back</Button>
              <div style={{ flex: 1 }} />
              <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
                {recruitTally > 0 && <RecruitTally>Available Recruits: <b>{recruitTally}</b></RecruitTally>}
                <Button
                  disabled={!!pendingCrewmate}
                  loading={!!pendingCrewmate}
                  subtle
                  isTransaction
                  onClick={confirmFinalize}>Recruit</Button>
              </div>
            </>
          )}
        </div>
      </Footer>
      {confirmingUnlock && (
        <ConfirmationDialog
          title="Unlock Traits"
          body={(
            <PromptBody>
              You are about to change <b>Crewmate Traits</b> that were determined by the choices you made in Story Mode.
              <br/><br/>
              Are you sure you want to continue?
            </PromptBody>
          )}
          onConfirm={() => { setTraitsLocked(false); setConfirmingUnlock(false); }}
          onReject={() => setConfirmingUnlock(false)}
        />
      )}
      {confirming && (
        <ConfirmationDialog
          title={`Confirm Character ${crewmate.id ? 'Details' : 'Minting'}`}
          body={(
            <PromptBody highlight>
              The Crewmate you are about to recruit will be minted as a new digital asset
              {crewmate.id ? '.' : <>, which currently costs <b><Ether>{formatters.crewmatePrice(priceConstants)}</Ether></b> and helps to fund game development.</>}
              <br/><br/>
              {crewmate.id ? 'You' : 'Once minted, you'}{' '}will be the sole owner of the Crewmate; nobody can
              delete them or take them from you. They will be yours to keep or trade forever. All of their
              stats, actions, skills, and other attributes will be stored in their unique on-chain history.
            </PromptBody>
          )}
          onConfirm={finalize}
          confirmText={(
            <>
              {crewmate.id ? 'Confirm' : 'Purchase Crewmate'}
              {!crewmate.id && priceConstants && (
                <span style={{ color: 'white', flex: 1, fontSize: '90%', textAlign: 'right', marginLeft: 15 }}>
                  {/* TODO: should this update price before "approve"? what about asteroids? */}
                  <Ether>{formatters.crewmatePrice(priceConstants)}</Ether>
                </span>
              )}
            </>
          )}
          onReject={() => setConfirming(false)}
          isTransaction
        />
      )}
    </>
  );
};

const Wrapper = ({ backLocation, crewId, crewmateId, locationId }) => {
  const bookSessionHook = useBookSession(crewId, crewmateId);
  return (
    <Details
      edgeToEdge
      headerProps={{ background: 'true', v2: 'true' }}
      onCloseDestination={onCloseDestination}
      contentInnerProps={{ style: { display: 'flex', flexDirection: 'column', height: '100%' } }}
      title="Crewmate Recruitment"
      width="1150px">
      {!bookSessionHook.bookSession && (
        <div style={{ position: 'absolute', left: 'calc(50% - 30px)', top: 'calc(50% - 30px)' }}>
          <LoadingAnimation color="white" />
        </div>
      )}
      {bookSessionHook.bookSession && (
        <CrewAssignmentCreate
          backLocation={backLocation}
          crewId={crewId}
          crewmateId={crewmateId}
          locationId={locationId}
          bookSessionHook={bookSessionHook} />
      )}
    </Details>
  );
}

export default Wrapper;
