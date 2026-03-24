'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import { SignUpFormSchema } from '@/lib/schemas';

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof SignUpFormSchema>>({
    resolver: zodResolver(SignUpFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password2: '',
    },
  });

  async function onSubmit(data: z.infer<typeof SignUpFormSchema>) {
    await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
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
          router.refresh();
        },
      },
    });
  }
  return (
    <>
      <section className="mx-auto max-w-md p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Sign Up</CardTitle>
            <CardDescription>
              Enter the following information to create your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6">
              {/* Sign Up Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="BetterAuth" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <FormField
                    control={form.control}
                    name="password2"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="" autoComplete="new-password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create an Account'}
                  </Button>
                </form>
              </Form>

              {/* Social Sign Up */}
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>
              <Button
                onClick={() => authClient.signIn.social({ provider: 'google' })}
                variant={'outline'}
              >
                <div className="flex h-4 w-4 items-center justify-center">
                  <GoogleIcon />
                </div>
                <span className="text-sm">Sign up with Google</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
