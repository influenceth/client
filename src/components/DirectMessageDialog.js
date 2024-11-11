import React, { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

import AddressLink from '~/components/AddressLink';
import GenericDialog from '~/components/GenericDialog';
import UncontrolledTextArea from '~/components/TextAreaUncontrolled';
import useInboxPublicKey from '~/hooks/useInboxPublicKey';
import useSession from '~/hooks/useSession';
import useWalletCrews from '~/hooks/useWalletCrews';
import api from '~/lib/api';
import formatters from '~/lib/formatters';
import { nativeBool } from '~/lib/utils';
import { LockIcon } from './Icons';
import useDirectMessageManager from '~/hooks/actionManagers/useDirectMessageManager';
import useStore from '~/hooks/useStore';

const Wrapper = styled.div`
  border-bottom: 1px solid #222;
  border-top: 1px solid #222;
  padding: 15px 0;
  text-align: left;

  & > label {
    display: block;
    margin-top: 15px;
    margin-bottom: 5px;
    &:first-child {
      margin-top: 0;
    }
  }

  textarea {
    height: 200px;
  }
`;
const Recipient = styled.div`
  border-left: 4px solid ${p => p.theme.colors.main};
  padding: 8px 10px;
  & > div {
    font-size: 13px;
    margin-top: 2px;
    opacity: 0.5;
  }
`;

const Footnote = styled.div`
  font-size: 12px;
  opacity: 0.3;
  text-align: center;
  ${p => p.highlight && `color: ${p.theme.colors.success}`}
`;

const DirectMessageDialog = ({ onClose, recipient }) => {
  const { data: crews } = useWalletCrews(recipient);
  const { encryptMessage, sendEncryptedMessage, sendingMessage } = useDirectMessageManager(recipient);
  const createAlert = useStore(s => s.dispatchAlertLogged);
  
  const [encryptedMessage, setEncryptedMessage] = useState();
  const [message, setMessage] = useState('');

  const sendMessage = useCallback(async () => {
    if (message?.length > 0) {
      const encryptedData = await encryptMessage(message);
      if (!encryptedData) {
        createAlert({
          type: 'GenericAlert',
          level: 'warning',
          data: { content: 'Encryption failed. Please refresh and try again.' },
          duration: 5000
        });
        return;
      }

      // set encrypted message (vanity)
      setEncryptedMessage(btoa(JSON.stringify(encryptedData)));
      
      // send encrypted message
      await sendEncryptedMessage(encryptedData);
      setEncryptedMessage(null);
      
    } else {
      createAlert({
        type: 'GenericAlert',
        level: 'warning',
        data: { content: 'Message cannot be empty.' },
        duration: 5000
      });
    }
  }, [message]);

  const wasSending = useRef();
  useEffect(() => {
    if (sendingMessage) {
      setMessage('');
      wasSending.current = true;
    } else if (wasSending.current) {
      onClose();
    }
  }, [onClose, sendingMessage]);

  return (
    <GenericDialog
      onConfirm={sendMessage}
      onReject={onClose}
      title="Direct Message"
      confirmText="Send"
      rejectText="Cancel">
      <Wrapper>
        <Recipient>
          <label><AddressLink address={recipient} doNotReplaceYou /></label>
          <div>
            {crews?.map((c, i) => (
              <Fragment key={c.id}>
                {i > 0 && ', '}{formatters.crewName(c)}
              </Fragment>
            ))}
          </div>
        </Recipient>

        <label>Message</label>
        <UncontrolledTextArea
          disabled={nativeBool(sendingMessage)}
          onChange={(e) => setMessage(e.currentTarget.value || '')}
          placeholder="Write your message..."
          value={encryptedMessage || message} />

        {encryptedMessage
          ? <Footnote highlight><LockIcon /> Message Encrypted</Footnote>
          : <Footnote>Upon sending, your message will be encrypted such that only the recipient can decrypt it.</Footnote>
        }
        
      </Wrapper>
    </GenericDialog>
  );
};

export default DirectMessageDialog;