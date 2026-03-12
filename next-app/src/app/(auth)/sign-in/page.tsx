'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { GoogleIcon } from '@/components/icons/google-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { authClient } from '@/lib/auth-client';
import { SignInFormSchema } from '@/lib/schemas';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [googleSignInPending, setGoogleSignInPending] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof SignInFormSchema>>({
    resolver: zodResolver(SignInFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleGoogleSignIn() {
    try {
      await authClient.signIn.social({
        provider: 'google',
        fetchOptions: {
          onRequest: () => setGoogleSignInPending(true),
          onResponse: () => setGoogleSignInPending(false),
          onError: (ctx) => {
            toast.error(`Uh Oh! ${ctx.error.message}`);
          },
        },
      });
    } catch (error: unknown) {
      let errorMessage = 'Failed to sign in with Google';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setGoogleSignInPending(false);
    }
  }

  async function onSubmit(data: z.infer<typeof SignInFormSchema>) {
    await authClient.signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: '/',
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
          router.push('/');
        },
      },
    });
  }

  return (
    <>
      <section className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Enter the following information to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Sign In Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="better@auth.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </Form>

              {/* Social Sign In */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>
              <Button
                onClick={handleGoogleSignIn}
                variant={'outline'}
                disabled={googleSignInPending}
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  {googleSignInPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                </div>
                <span className="text-sm">Sign in with Google</span>
              </Button>

              {/* Sign Up Link */}
              <div className="flex w-full justify-center space-x-2">
                <span>Don&apos;t have an account?</span>
                <Link className="underline" href={'sign-up'}>
                  Sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
