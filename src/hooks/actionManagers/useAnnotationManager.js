import { useCallback, useContext, useMemo, useState } from 'react';
import { Entity } from '@influenceth/sdk';

import ChainTransactionContext from '~/contexts/ChainTransactionContext';
import useCrewContext from '~/hooks/useCrewContext';
import useEarliestActivity from '~/hooks/useEarliestActivity';
import api from '~/lib/api';

export const isValidAnnotation = () => {
  return true;
};

const useAnnotationManager = (entity) => {
  const { crew } = useCrewContext();
  const { execute, getStatus } = useContext(ChainTransactionContext);
  const { data: earliest } = useEarliestActivity(entity);

  const crewId = crew?.id;

  const [saving, setSaving] = useState();

  const payload = useMemo(() => ({
    transaction_hash: earliest?.event?.transactionHash,
    log_index: earliest?.event?.logIndex,
    caller_crew: { id: crewId, label: Entity.IDS.CREW }
  }), [earliest]);

  const saveAnnotation = useCallback(
    async (content) => {
      setSaving(true);

      const annotation = { content, type: 'EventAnnotation', version: 1 };
      const hash = await api.getAnnotationHash(annotation);
      execute(
        'AnnotateEvent',
        {
          ...payload,
          content_hash: hash.match(/.{1,31}/g) // chunk into shortstrings (max-length 31)
        },
        {
          entity,
          annotation
        }
      );

      setSaving(false);
    },
    [execute, payload]
  );

  const status = useMemo(
    () => getStatus('AnnotateEvent', { ...payload }),
    [getStatus, payload]
  );

  return {
    saveAnnotation,
    savingAnnotation: saving || (status === 'pending'),
    txPending: (status === 'pending')
  };
};

export default useAnnotationManager;
