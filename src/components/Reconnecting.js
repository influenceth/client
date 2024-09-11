import { useEffect, useState } from '~/lib/react-debug';

import FullpageInterstitial from '~/components/FullpageInterstitial';

const Reconnecting = ({ onLogout, walletName }) => {
  const [show, setShow] = useState(false);

  // give a moment to successfully connect without showing an extra screen...
  useEffect(import.meta.url, () => {
    const to = setTimeout(() => {
      setShow(true);
    }, 1500);
    return () => clearTimeout(to);
  }, []);

  if (!show) return null;
  return (
    <FullpageInterstitial
      message={`Attempting to reconnect to ${walletName || 'your Starknet wallet'}...`}
      onSkip={onLogout}
      skipContent="Skip Login"
    />
  );
}

export default Reconnecting;
