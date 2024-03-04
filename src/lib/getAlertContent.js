import { UpdateIcon, WarningIcon, SettingsIcon, WalletIcon, ClipboardIcon } from '~/components/Icons';

const entries = {
  //
  // Generic
  //

  GenericAlert: (e) => ({
    icon: <WarningIcon />,
    content: <span>{e.content}</span>
  }),

  // TODO: this may be out of use...
  GenericLoadingError: (e) => ({
    content: (
      <span>Error loading {e.label || 'data'}. Please refresh and try again.</span>
    ),
  }),

  WalletAlert: (e) => ({
    icon: <WalletIcon />,
    content: <span>{e.content}</span>
  }),

  ClipboardAlert: (e) => ({
    icon: <ClipboardIcon />,
    content: <span>{e.content}</span>
  }),

  //
  // App-level
  //

  App_Updated: (e) => ({
    icon: <UpdateIcon />,
    content: (
      <>
        <span>A new version of Influence is now available! </span>
        <span><b>Click here</b> to update your client.</span>
      </>
    )
  }),

  Game_GPUPrompt: (e) => ({
    icon: <SettingsIcon />,
    content: (
      <>
        <span>Please consider turning on browser hardware accleration for a better experience.</span>
        <span> Find instructions </span>
        <a href="https://www.computerhope.com/issues/ch002154.htm" rel="noreferrer" target="_blank">
          here
        </a>
      </>
    ),
  }),

  //
  // Activities
  //

  ActivityLog: (logContent) => {
    if (!logContent) return null;

    const { icon, content, txHash } = logContent;
    return {
      icon,
      content,
      txLink: txHash ? `${process.env.REACT_APP_STARKNET_EXPLORER_URL}/tx/${txHash}` : null,
    }
  },
};

const getAlertContent = ({ type, data }) => {
  try {
    return entries[type](data);
  } catch (e) {
    return null;
  }
};

export default getAlertContent;
