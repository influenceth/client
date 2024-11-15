import { useCallback, useContext, useMemo, useState } from 'react';
import { Encryption } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useInboxPublicKey from '~/hooks/useInboxPublicKey';
import useSession from '~/hooks/useSession';
import useUser from '~/hooks/useUser';
import api from '~/lib/api';
import { maxAnnotationLength } from '~/lib/utils';

export const isValidAnnotation = (val) => {
  if (val.length > maxAnnotationLength) return false;
  if (val.length === 0) return false;
  return true;
};

const useDirectMessageManager = (recipient) => {
  const { data: user } = useUser();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: recipientPublicKey } = useInboxPublicKey(recipient);

  const [hashing, setHashing] = useState();

  const encryptMessage = useCallback(
    async (message) => {
      console.log('recipientPublicKey', recipientPublicKey);
      console.log('senderPublicKey', user, user?.publicKey);
      console.log('message', message);
      if (recipientPublicKey && user?.publicKey && message) {
        return {
          sender: await Encryption.encryptContent(user?.publicKey, message),
          recipient: await Encryption.encryptContent(recipientPublicKey, message)
        }
      }
      return null;
    },
    [recipientPublicKey, user?.publicKey]
  );

  const sendEncryptedMessage = useCallback(
    async (encryptedMessage) => {
      setHashing(true);
      const hash = await api.getDirectMessageHash({
        content: encryptedMessage,
        type: 'DirectMessage',
        version: 1
      });
      setHashing(false);
      if (!hash) return;

      await execute(
        'DirectMessage',
        {
          recipient,
          content_hash: hash.match(/.{1,31}/g) // chunk into shortstrings (max-length 31)
        },
        {
          encryptedMessage
        }
      );
    },
    [execute, recipient]
  );

  const status = useMemo(
    () => getStatus('DirectMessage', { recipient }),
    [getStatus, recipient]
  );

  return {
    encryptMessage,
    sendEncryptedMessage,
    isHashing: hashing,
    isSending: (status === 'pending'),
  };
};

export default useDirectMessageManager;
