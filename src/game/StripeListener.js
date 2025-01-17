import { useCallback, useEffect } from 'react';
import { appConfig } from '~/appConfig';
import useSession from '~/hooks/useSession';

import useStore from '~/hooks/useStore';
import useWebsocket from '~/hooks/useWebsocket';

const StripeListener = () => {
  const { deployWithSubsidy, isDeployed } = useSession();
  const {
    registerMessageHandler,
    unregisterMessageHandler,
    wsReady
  } = useWebsocket();

  const createAlert = useStore(s => s.dispatchAlertLogged);

  const handleWSMessage = useCallback((message) => {
    if (appConfig.get('App.verboseLogs')) console.log('onWSMessage (stripe)', message);

    const { type, body } = message;
    if (type === 'STRIPE_PAYMENT_SUCCESS') {
      createAlert({
        type: 'GenericAlert',
        data: { content: `Payment processed successfully!${isDeployed ? '' : ' Activating account...'}` },
        duration: 3000,
        level: 'success',
      });
      if (!isDeployed) {
        deployWithSubsidy();
      }

    } else if (type === 'STRIPE_PAYMENT_FAILURE') {
      createAlert({
        type: 'GenericAlert',
        data: {
          content: body?.payment?.last_payment_error?.message
            ? `Payment processing failed: "${body?.payment?.last_payment_error?.message}"`
            : 'Payment processing failed. Please try again.'
        },
        duration: 0,
        level: 'warning',
      });
    }
  }, [deployWithSubsidy, isDeployed]);

  useEffect(() => {
    if (wsReady) {
      const messageRegId = registerMessageHandler(handleWSMessage);
      return () => {
        unregisterMessageHandler(messageRegId);
      };
    }
  }, [handleWSMessage, wsReady]);

  return null;
};

export default StripeListener;