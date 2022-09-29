import { AiFillEdit, AiFillEye, AiFillStar } from 'react-icons/ai';
import { BsFillPersonFill, BsCheckCircle, BsChevronLeft, BsPieChartFill } from 'react-icons/bs';
import { FaEthereum, FaMapMarkedAlt, FaCopy } from 'react-icons/fa';
import { FiMenu } from 'react-icons/fi';
import { HiClock } from 'react-icons/hi';
import {
  MdAccountBalanceWallet,
  MdFlag,
  MdBlurOff,
  MdChevronRight,
  MdClose,
  MdExpandMore,
  MdFastRewind,
  MdFastForward,
  MdPlayArrow,
  MdPause,
  MdStop,
  MdNavigateBefore,
  MdNavigateNext,
  MdFirstPage
} from 'react-icons/md';
import {
  RiInformationLine,
  RiPagesFill,
  RiTableFill,
  RiRouteFill,
  RiLoginCircleFill,
  RiAlertFill,
  RiFilter2Fill
} from 'react-icons/ri';
import { TiArrowRight } from 'react-icons/ti';
import { WiMoonAltWaningCrescent5 } from 'react-icons/wi';
import { VscDebugDisconnect } from 'react-icons/vsc';

import AdalianSVG from '~/assets/icons/AdalianIcon.svg';
import ArvadSVG from '~/assets/icons/ArvadIcon.svg';
import CaptainSVG from '~/assets/icons/CaptainIcon.svg';
import ChapterSVG from '~/assets/icons/ChapterIcon.svg';
import CheckSVG from '~/assets/icons/CheckIcon.svg';
import ChevronDoubleDownSVG from '~/assets/icons/ChevronDoubleDownIcon.svg';
import CrewSVG from '~/assets/icons/CrewIcon.svg';
import EccentricitySVG from '~/assets/icons/EccentricityIcon.svg';
import HexagonSVG from '~/assets/icons/HexagonIcon.svg';
import InclinationSVG from '~/assets/icons/InclinationIcon.svg';
import LinkSVG from '~/assets/icons/LinkIcon.svg';
import LockSVG from '~/assets/icons/LockIcon.svg';
import OrbitalPeriodSVG from '~/assets/icons/OrbitalPeriodIcon.svg';
import PromoteSVG from '~/assets/icons/PromoteIcon.svg';
import RadiusSVG from '~/assets/icons/RadiusIcon.svg';
import RocketSVG from '~/assets/icons/RocketIcon.svg';
import SemiMajorAxisSVG from '~/assets/icons/SemiMajorAxisIcon.svg';
import SurfaceAreaSVG from '~/assets/icons/SurfaceAreaIcon.svg';
import SwaySVG from '~/assets/icons/SwayIcon.svg';
import SwayMonochromeSVG from '~/assets/icons/SwayMonoIcon.svg';
import TrophySVG from '~/assets/icons/TrophyIcon.svg';
import TwitterSVG from '~/assets/icons/TwitterIcon.svg';
import WarningOutlineSVG from '~/assets/icons/WarningOutlineIcon.svg';

/*
  A note on importing custom icons...
  1) These should be the top-level attributes (viewBox should keep its original value):
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 64 64"
  2) Any explicit specification of fill or stroke color should be removed.
  3) Any absolute specifications of stroke width, etc should be converted to a percentage (relative to viewbox).
  4) References to any now-deprecated classes can be removed from paths, etc
  5) If the icon is close to square, square off the viewbox:
    a) Set the start of the smaller dimension to (smaller_dimension - larger_dimension)/2
    b) Set the smaller dimension to match the larger dimension
    Else, on the style below, set the width on the `${width/height}em`
  5) View the altered SVG to make sure it still looks right (https://www.svgviewer.dev/ is a good tool)
*/
export const AdalianIcon = () => <AdalianSVG className="icon" />;
export const ArvadIcon = () => <ArvadSVG className="icon" style={{ width: '1.94em' }} />;
export const CaptainIcon = () => <CaptainSVG className="icon" style={{ width: '3.05em' }} />;
export const ChapterIcon = () => <ChapterSVG className="icon" />;
export const CheckIcon = () => <CheckSVG className="icon" style={{ width: '1.314em' }} />;
export const ChevronDoubleDownIcon = () => <ChevronDoubleDownSVG className="icon" />;
export const ChevronDoubleUpIcon = () => <ChevronDoubleDownSVG className="icon" style={{ transform: 'rotate(180deg)' }} />;
export const CrewIcon = () => <CrewSVG className="icon" />;
export const EccentricityIcon = () => <EccentricitySVG className="icon" />;
export const HexagonIcon = () => <HexagonSVG className="icon" />;
export const InclinationIcon = () => <InclinationSVG className="icon" />;
export const LinkIcon = () => <LinkSVG className="icon" />;
export const LockIcon = () => <LockSVG className="icon" />;
export const OrbitalPeriodIcon = () => <OrbitalPeriodSVG className="icon" />;
export const PromoteIcon = () => <PromoteSVG className="icon" />;
export const RadiusIcon = () => <RadiusSVG className="icon" />;
export const RocketIcon = () => <RocketSVG className="icon" />;
export const SemiMajorAxisIcon = () => <SemiMajorAxisSVG className="icon" />;
export const SurfaceAreaIcon = () => <SurfaceAreaSVG className="icon" />;
export const SwayIcon = () => <SwaySVG className="icon" />;
export const SwayMonochromeIcon = () => <SwayMonochromeSVG className="icon" />;
export const TrophyIcon = () => <TrophySVG className="icon" />;
export const TwitterIcon = () => <TwitterSVG className="icon" />;
export const WarningOutlineIcon = () => <WarningOutlineSVG className="icon" />;

export {
  AiFillEdit as EditIcon,
  AiFillEye as EyeIcon,
  AiFillStar as StarIcon,
  BsCheckCircle as CheckCircleIcon,
  BsChevronLeft as BackIcon,
  BsFillPersonFill as CrewMemberIcon,
  BsPieChartFill as CompositionIcon,
  FaCopy as CopyIcon,
  FaEthereum as ConnectIcon,
  RiPagesFill as DetailIcon,
  FaMapMarkedAlt as MapIcon,
  FiMenu as MenuIcon,
  HiClock as TimeIcon,
  // HiUserGroup as CrewIcon,
  MdAccountBalanceWallet as WalletIcon,
  MdBlurOff as ScanIcon,
  MdChevronRight as CollapsedIcon,
  MdClose as CloseIcon,
  MdExpandMore as ExpandedIcon,
  MdFastRewind as RewindIcon,
  MdFastForward as FastForwardIcon,
  MdFirstPage as BeginningIcon,
  MdFlag as ClaimIcon,
  MdNavigateBefore as PreviousIcon,
  MdNavigateNext as NextIcon,
  MdPause as PauseIcon,
  MdPlayArrow as PlayIcon,
  MdStop as StopIcon,
  RiAlertFill as WarningIcon,
  RiFilter2Fill as FilterIcon,
  RiInformationLine as InfoIcon,
  RiLoginCircleFill as LoginIcon,
  RiRouteFill as RouteIcon,
  RiTableFill as TableIcon,
  TiArrowRight as GoIcon,
  VscDebugDisconnect as DisconnectIcon,
  WiMoonAltWaningCrescent5 as DownloadModelIcon
};
