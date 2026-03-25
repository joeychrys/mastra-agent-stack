"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2, MoveRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { SignInFormSchema } from "@/lib/schemas";

function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: SignInFormSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: callbackUrl,
        fetchOptions: {
          onResponse: () => {
            setLoading(false);
          },
          onRequest: () => {
            setLoading(true);
          },
          onError: (ctx) => {
            toast.error(`Uh Oh! ${ctx.error.message}`);
          },
          onSuccess: async () => {
            router.push(callbackUrl);
          },
        },
      });
    },
  });

  async function handleGoogleSignIn() {
    try {
      await authClient.signIn.social({
        provider: "google",
        fetchOptions: {
          onRequest: () => setGoogleSignInPending(true),
          onResponse: () => setGoogleSignInPending(false),
          onError: (ctx) => {
            toast.error(`Uh Oh! ${ctx.error.message}`);
          },
        },
      });
    } catch (error: unknown) {
      let errorMessage = "Failed to sign in with Google";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setGoogleSignInPending(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 sm:p-10">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back. Enter your credentials below.
          </p>
        </div>

        <Separator />

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          <FieldGroup>
            <form.Field name="email">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Email address</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="you@example.com"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="current-password"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>

          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Continue
                <MoveRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-card px-2 text-muted-foreground">or</span>
        </div>

        {/* Social sign in */}
        <Button
          onClick={handleGoogleSignIn}
          variant="outline"
          size="lg"
          disabled={googleSignInPending}
          className="w-full"
        >
          <div className="flex h-4 w-4 items-center justify-center">
            {googleSignInPending ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
          </div>
          <span className="text-sm">Continue with Google</span>
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            href={
              callbackUrl !== "/"
                ? `/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/sign-up"
            }
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
