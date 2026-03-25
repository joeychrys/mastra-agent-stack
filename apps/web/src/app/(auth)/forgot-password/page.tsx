"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2, MoveRight } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { ForgotPasswordFormSchema } from "@/lib/schemas";

function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: ForgotPasswordFormSchema,
    },
    onSubmit: async ({ value }) => {
      setLoading(true);
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: "/reset-password",
      });
      setLoading(false);

      if (error) {
        toast.error(`Uh Oh! ${error.message}`);
      } else {
        setSubmitted(true);
      }
    },
  });

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 sm:p-10">
        {submitted ? (
          <>
            {/* Success state */}
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                If an account exists with that email, we&apos;ve sent a password reset link. Check
                your inbox and follow the instructions.
              </p>
            </div>

            <Separator />

            <Button
              size="lg"
              className="w-full"
              onClick={() => setSubmitted(false)}
              variant="outline"
            >
              Try a different email
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Back to{" "}
              <Link
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                href="/sign-in"
              >
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* Form state */}
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <Separator />

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

            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link
                className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                href="/sign-in"
              >
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
