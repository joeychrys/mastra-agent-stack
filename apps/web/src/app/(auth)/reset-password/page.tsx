"use client";

import { useForm } from "@tanstack/react-form";
import { Loader2, MoveRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { ResetPasswordFormSchema } from "@/lib/schemas";

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const form = useForm({
    defaultValues: {
      password: "",
      password2: "",
    },
    validators: {
      onSubmit: ResetPasswordFormSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.resetPassword({
        newPassword: value.password,
        token: token || "123",
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
            toast.success("Password reset successfully");
            router.push("/account/security");
          },
        },
      });
    },
  });

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token, router]);

  if (!token) {
    return null;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 sm:p-10">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
          <p className="text-sm text-muted-foreground">Enter your new password below.</p>
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
            <form.Field name="password">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="password2">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
                    <PasswordInput
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
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

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            href="/sign-in"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
