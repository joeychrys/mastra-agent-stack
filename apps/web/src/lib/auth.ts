import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, jwt, openAPI } from "better-auth/plugins";
import { Resend } from "resend";
import { DeleteAccountEmail } from "@/components/email-templates/account-deletion-email";
import { ResetPasswordEmail } from "@/components/email-templates/reset-password";
import { VerificationEmail } from "@/components/email-templates/verification-email";

import db from "@/db";

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? "");
const getPolarClient = () =>
  new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    server: "sandbox",
  });

export const auth = betterAuth({
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await getResend().emails.send({
          from: "Next Starter <account-services@joeychrys.com>",
          to: user.email,
          subject: "Verify your account deletion",
          react: DeleteAccountEmail({ user, url }) as React.ReactElement,
        });
      },
      afterDelete: async (user, _request) => {
        await getPolarClient().customers.deleteExternal({
          externalId: user.id,
        });
      },
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await getResend().emails.send({
        from: "Next Starter <account-services@joeychrys.com>",
        to: user.email,
        subject: "Reset your password",
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
        from: "Next Starter <account-services@joeychrys.com>",
        to: user.email,
        subject: "Verify your email address",
        react: VerificationEmail({ user, url }) as React.ReactElement,
      });
    },
  },
  plugins: [
    openAPI(),
    admin(),
    jwt(),
    polar({
      client: getPolarClient(),
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId: "9402dcea-33d6-4311-a6a0-d6e62a3980a8",
              slug: "basic",
            },
            {
              productId: "41ed1276-c3d4-4c83-98d8-2c7fa9a45fac",
              slug: "pro",
            },
            {
              productId: "ea5f81cb-7443-4dae-8a04-0a26460d1647",
              slug: "max",
            },
          ],
          successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success?checkout_id={CHECKOUT_ID}`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET ?? "",
        }),
      ],
    }),
    nextCookies(),
  ],
});
