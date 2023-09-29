import getActivityConfig from './activities';

const entries = {
  //
  // Generic
  //

  GenericAlert: (e) => ({
    content: <span>{e.content}</span>
  }),

  // TODO: this may be out of use...
  GenericLoadingError: (e) => ({
    content: (
      <span>Error loading {e.label || 'data'}. Please refresh and try again.</span>
    ),
  }),

  //
  // App-level
  //

  App_Updated: (e) => ({
    content: (
      <>
        <span>A new version of Influence is now available! </span>
        <span>Click here to update your experience.</span>
      </>
    )
  }),

  Game_GPUPrompt: (e) => ({
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

  ActivityLog: (activity) => {
    const { logContent } = getActivityConfig(activity);
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