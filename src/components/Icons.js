import { AiFillEdit, AiFillEye, AiFillStar } from 'react-icons/ai';
import { BsFillPersonFill, BsCheckCircle, BsChevronLeft } from 'react-icons/bs';
import { FaEthereum, FaMapMarkedAlt, FaCopy } from 'react-icons/fa';
import { FiMenu } from 'react-icons/fi';
import { HiClock, HiUserGroup } from 'react-icons/hi';
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
import { RiPagesFill, RiTableFill, RiRouteFill, RiLoginCircleFill, RiAlertFill, RiFilter2Fill } from 'react-icons/ri';
import { TiArrowRight } from 'react-icons/ti';
import { WiMoonAltWaningCrescent5 } from 'react-icons/wi';
import { VscDebugDisconnect } from 'react-icons/vsc';

import ArvadSVG from '~/assets/icons/ArvadIcon.svg';
import ChapterSVG from '~/assets/icons/ChapterIcon.svg';
import CheckSVG from '~/assets/icons/CheckIcon.svg';
import ChevronDoubleDownSVG from '~/assets/icons/ChevronDoubleDownIcon.svg';
import LinkSVG from '~/assets/icons/LinkIcon.svg';
import LockSVG from '~/assets/icons/LockIcon.svg';
import RocketSVG from '~/assets/icons/RocketIcon.svg';
import TrophySVG from '~/assets/icons/TrophyIcon.svg';
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
export const ArvadIcon = () => <ArvadSVG className="icon" style={{ width: '1.94em' }} />;
export const ChapterIcon = () => <ChapterSVG className="icon" />;
export const CheckIcon = () => <CheckSVG className="icon" style={{ width: '1.314em' }} />;
export const ChevronDoubleDownIcon = () => <ChevronDoubleDownSVG className="icon" />;
export const LinkIcon = () => <LinkSVG className="icon" />;
export const LockIcon = () => <LockSVG className="icon" />;
export const RocketIcon = () => <RocketSVG className="icon" />;
export const TrophyIcon = () => <TrophySVG className="icon" />;
export const WarningOutlineIcon = () => <WarningOutlineSVG className="icon" />;

export {
  AiFillEdit as EditIcon,
  AiFillEye as EyeIcon,
  AiFillStar as StarIcon,
  BsCheckCircle as CheckCircleIcon,
  BsChevronLeft as BackIcon,
  BsFillPersonFill as CrewMemberIcon,
  FaCopy as CopyIcon,
  FaEthereum as ConnectIcon,
  RiPagesFill as DetailIcon,
  FaMapMarkedAlt as MapIcon,
  FiMenu as MenuIcon,
  HiClock as TimeIcon,
  HiUserGroup as CrewIcon,
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
  RiLoginCircleFill as LoginIcon,
  RiRouteFill as RouteIcon,
  RiTableFill as TableIcon,
  TiArrowRight as GoIcon,
  VscDebugDisconnect as DisconnectIcon,
  WiMoonAltWaningCrescent5 as DownloadModelIcon
};
