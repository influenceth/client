import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useQuery } from 'react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import { appConfig } from '~/appConfig';
import BrightButton from '~/components/BrightButton';
import Details from '~/components/DetailsV2';
import PageLoader from '~/components/PageLoader';
import useStore from '~/hooks/useStore';
import api from '~/lib/api';
import { nativeBool } from '~/lib/utils';

const stripePromise = loadStripe(appConfig.get('Api.ClientId.stripe'));

const CheckoutForm = styled.form``;
const PaymentButton = styled(BrightButton).attrs({ success: true })`
  margin: 20px auto 20px;
  width: calc(100% - 8px);
`;

const StripeInner = ({ onClose, price, productId, productName, metadata = {} }) => {
  const createAlert = useStore(s => s.dispatchAlertLogged);
  const elements = useElements();
  const stripe = useStripe();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    let errMsg;
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/launcher/store`,
        }
      });
      console.log('result', result);
      if (result.error) {
        errMsg = result.error.message;
      } else if (result.paymentIntent.status === 'succeeded') {
        window.alert('Payment succeeded!');
        return;
      } else {
        console.log('wtf');
      }
    } catch (e) {
      errMsg = e.message;
    }

    createAlert({
      type: 'GenericAlert',
      level: 'warning',
      data: { content: errMsg || 'Something went wrong. Please try again.' },
      duration: 5000
    });
  };

  return (
    <CheckoutForm onSubmit={handleSubmit}>
      <PaymentElement />
      <PaymentButton disabled={nativeBool(!stripe)} type="submit">
        Submit Payment{price ? ` ($${price / 100})` : ''}
      </PaymentButton>
    </CheckoutForm>
  );
};

const StripeCheckout = (props) => {
  const { data: intent, isLoading } = useQuery(
    ['stripeIntent', props.productId],
    () => api.createStripePaymentIntent(props.productId),
    { enabled: !!props.productId }
  );

  return createPortal(
    (
      <Details
        title={props.productName || "Checkout"}
        onClose={props.onClose}
        modalMode
        style={{ zIndex: 9000 }}>
        <div style={{ ...(isLoading ? { height: 300 } : { minHeight: 300 }), minWidth: 440 }}>
          {isLoading && <PageLoader message="Connecting to Stripe..." />}
          {!isLoading && !intent && <div>Failed to connect to Stripe. Please refresh and try again.</div>}
          {intent?.clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                appearance: {
                  theme: 'night'
                },
                clientSecret: intent?.clientSecret
              }}>
              <StripeInner {...props} />
            </Elements>
          )}
        </div>
      </Details>
    ),
    document.body
  );
};

export default StripeCheckout;