import { useCallback, useContext, useMemo, useState } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import api from '~/lib/api';
import { maxAnnotationLength } from '~/lib/utils';
import useSession from '../useSession';
import useInboxPublicKey from '../useInboxPublicKey';
import { encryptContent } from '~/lib/encrypt';

export const isValidAnnotation = (val) => {
  if (val.length > maxAnnotationLength) return false;
  if (val.length === 0) return false;
  return true;
};

const useDirectMessageManager = (recipient) => {
  const { accountAddress } = useSession();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: publicKey } = useInboxPublicKey(recipient);

  const [saving, setSaving] = useState();

  const encryptMessage = useCallback(
    async (message) => (publicKey && message)
      ? encryptContent(publicKey, message)
      : null
    ,
    [publicKey]
  );

  const sendMessage = useCallback(
    async (encryptedMessage) => {
      const hashable = {
        publicKey,
        encryptedMessage,
        type: 'DirectMessage',
        version: 1
      };
      const hash = await api.getDirectMessageHash(hashable);
      await execute(
        'DirectMessage',
        {
          recipient,
          content_hash: hash.match(/.{1,31}/g) // chunk into shortstrings (max-length 31)
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
    sendMessage,
    sendingMessage: saving || (status === 'pending'),
    txPending: (status === 'pending')
  };
};

export default useDirectMessageManager;
