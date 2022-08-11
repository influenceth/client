import { useCallback } from 'react';
import styled from 'styled-components';
import Clipboard from 'react-clipboard.js';

import useAuth from '~/hooks/useAuth';
import useStore from '~/hooks/useStore';

const StyledClipboard = styled(Clipboard)`
  text-decoration: none;
`;

const CopyReferralLink = ({ children, fallbackContent }) => {
  const { account } = useAuth();
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
      data-clipboard-text={`${document.location.origin}/play?r=${account}`}
      onClick={handleClick}>
      {children}
    </StyledClipboard>
  );
}

export default CopyReferralLink;