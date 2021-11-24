import { AiFillEdit, AiFillEye, AiFillStar } from 'react-icons/ai';
import { BsFillPersonFill, BsCheckCircle, BsChevronLeft } from 'react-icons/bs';
import { FaCheck, FaEthereum, FaMapMarkedAlt, FaCopy } from 'react-icons/fa';
import { FiMenu } from 'react-icons/fi';
import { HiClock, HiLockClosed, HiUserGroup } from 'react-icons/hi';
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
import { RiTableFill, RiRouteFill, RiLoginCircleFill, RiAlertLine, RiAlertFill, RiFilter2Fill } from 'react-icons/ri';
import { TiArrowRight } from 'react-icons/ti';
import { WiMoonAltWaningCrescent5 } from 'react-icons/wi';
import { VscDebugDisconnect } from 'react-icons/vsc';

import ArvadSVG from '~/assets/icons/ArvadIcon.svg';
import ChapterSVG from '~/assets/icons/ChapterIcon.svg';
import RocketSVG from '~/assets/icons/RocketIcon.svg';
import TrophySVG from '~/assets/icons/TrophyIcon.svg';

/*
  A note on importing custom icons...
  1) These should be the top-level attributes (viewBox should keep its original value):
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" viewBox="0 0 64 64"
  2) <defs> and <style> data should be removed (and references to any internal classes removed from paths, etc)
  3) View the altered SVG to make sure it still looks right.
*/
export const ArvadIcon = () => <ArvadSVG className="icon" style={{ width: '1.94em' }} />;
export const ChapterIcon = () => <ChapterSVG className="icon" />;
export const RocketIcon = () => <RocketSVG className="icon" />;
export const TrophyIcon = () => <TrophySVG className="icon" />;

export {
  AiFillEdit as EditIcon,
  AiFillEye as EyeIcon,
  AiFillStar as StarIcon,
  BsCheckCircle as CheckCircleIcon,
  BsChevronLeft as BackIcon,
  BsFillPersonFill as CrewMemberIcon,
  FaCheck as CheckIcon,
  FaCopy as CopyIcon,
  FaEthereum as ConnectIcon,
  FaMapMarkedAlt as MapIcon,
  FiMenu as MenuIcon,
  HiClock as TimeIcon,
  HiLockClosed as LockIcon,
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
  RiAlertLine as WarningOutlineIcon,
  RiFilter2Fill as FilterIcon,
  RiLoginCircleFill as LoginIcon,
  RiRouteFill as RouteIcon,
  RiTableFill as TableIcon,
  TiArrowRight as GoIcon,
  VscDebugDisconnect as DisconnectIcon,
  WiMoonAltWaningCrescent5 as DownloadModelIcon
};
