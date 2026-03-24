'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { UsernameFormSchema } from '@/lib/schemas';

export default function NameChangeDialog() {
  const router = useRouter();
  const { isPending } = authClient.useSession();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof UsernameFormSchema>>({
    resolver: zodResolver(UsernameFormSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(data: z.infer<typeof UsernameFormSchema>) {
    try {
      await authClient.updateUser({
        name: data.name,
      });
      toast.success('Profile updated successfully');
      router.refresh(); // Refresh the page to show the updated profile
      setDialogOpen(false);
    } catch (error: unknown) {
      let errorMessage = 'Failed to update profile';
      if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`;
      }
      toast.error(errorMessage);
    }
  }
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mt-2 sm:mt-0 sm:ml-auto sm:flex-shrink-0">
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Make changes to your profile information here.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
