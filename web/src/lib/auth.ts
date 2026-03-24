import { polar, checkout, portal, usage, webhooks } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, openAPI, jwt } from 'better-auth/plugins';
import { Resend } from 'resend';

import { ResetPasswordEmail } from '@/components/email-templates/reset-password';
import { VerificationEmail } from '@/components/email-templates/verification-email';
import { DeleteAccountEmail } from '@/components/email-templates/account-deletion-email';

import db from '@/db';

const getResend = () => new Resend(process.env.RESEND_API_KEY!);
const getPolarClient = () =>
  new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: 'sandbox',
  });

export const auth = betterAuth({
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url, token }) => {
        await getResend().emails.send({
          from: 'Next Starter <account-services@joeychrys.com>',
          to: user.email,
          subject: 'Verify your account deletion',
          react: DeleteAccountEmail({ user, url }) as React.ReactElement,
        });
      },
      afterDelete: async (user, request) => {
        await getPolarClient().customers.deleteExternal({
          externalId: user.id,
        });
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await getResend().emails.send({
        from: 'Next Starter <account-services@joeychrys.com>',
        to: user.email,
        subject: 'Reset your password',
        react: ResetPasswordEmail({ user, url }) as React.ReactElement,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await getResend().emails.send({
        from: 'Next Starter <account-services@joeychrys.com>',
        to: user.email,
        subject: 'Verify your email address',
        react: VerificationEmail({ user, url }) as React.ReactElement,
      });
    },
  },
  plugins: [
    openAPI(),
    admin(),
    nextCookies(),
    jwt(),
    polar({
      client: getPolarClient(),
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: 'f22fe868-afdb-4234-afe7-2766cb373ebd',
              slug: 'basic',
            },
            {
              productId: '9813452d-8812-4f49-9d33-a34be797b46b',
              slug: 'pro',
            },
            {
              productId: 'b85cdce5-fabd-4fb4-b3ff-620893bd795c',
              slug: 'tokens',
            },
          ],
          successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?checkout_id={CHECKOUT_ID}`,
        }),
        portal(),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
        }),
      ],
    }),
  ],
});
