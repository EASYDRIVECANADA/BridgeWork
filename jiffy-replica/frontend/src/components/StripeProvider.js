'use client';

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

export default function StripeProvider({ children, clientSecret }) {
  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#2D7FE6',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '1px solid #d1d5db',
              boxShadow: 'none',
              padding: '10px 12px',
            },
            '.Input:focus': {
              border: '1px solid #2D7FE6',
              boxShadow: '0 0 0 1px #2D7FE6',
            },
            '.Label': {
              fontWeight: '500',
              fontSize: '14px',
              marginBottom: '6px',
            },
          },
        },
      }
    : {};

  if (!clientSecret) {
    return <>{children}</>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
