import { useCallback } from 'react';
import styled from 'styled-components';
import { useWeb3React } from '@web3-react/core';
import Clipboard from 'react-clipboard.js';

import useStore from '~/hooks/useStore';

const StyledClipboard = styled(Clipboard)`
  text-decoration: none;
`;

const CopyReferralLink = ({ children, fallbackContent }) => {
  const { account } = useWeb3React();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);

  const handleClick = useCallback(() => {
    playSound('effects.click');
    createAlert({
      type: 'GenericAlert',
      content: 'Recruitment link copied to your clipboard.',
    });
  }, [createAlert, playSound]);

  if (!account) return fallbackContent || null;
  return (
    <StyledClipboard
      component="span"
      data-clipboard-text={`${document.location.origin}?r=${account}`}
      onClick={handleClick}>
      {children}
    </StyledClipboard>
  );
}

export default CopyReferralLink;