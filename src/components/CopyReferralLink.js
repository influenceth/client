import { useCallback } from 'react';
import styled from 'styled-components';
import Clipboard from 'react-clipboard.js';

import useSession from '~/hooks/useSession';
import useStore from '~/hooks/useStore';

const StyledClipboard = styled(Clipboard)`
  text-decoration: none;
`;

const CopyReferralLink = ({ children, fallbackContent }) => {
  const { accountAddress } = useSession();
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const playSound = useStore(s => s.dispatchSoundRequested);

  const handleClick = useCallback(() => {
    playSound('effects.click');
    createAlert({
      type: 'ClipboardAlert',
      data: { content: 'Recruitment link copied to clipboard.' },
    });
  }, [createAlert, playSound]);

  if (!accountAddress) return fallbackContent || null;
  return (
    <StyledClipboard
      component="span"
      data-clipboard-text={`${document.location.origin}/play?r=${accountAddress}`}
      onClick={handleClick}>
      {children}
    </StyledClipboard>
  );
}

export default CopyReferralLink;