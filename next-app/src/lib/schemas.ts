import { z } from 'zod';

export const emailSchema = z
  .string({
    message: 'Email can not be empty.',
  })
  .email({
    message: 'Invalid email address.',
  });

export const nameSchema = z
  .string({
    message: 'Name can not be empty.',
  })
  .min(4, {
    message: 'Minimum 4 characters.',
  })
  .max(40, {
    message: 'Maximum 40 characters.',
  })
  .regex(/^[a-zA-Z ]*$/, {
    message: 'Only letters are allowed.',
  });

export const passwordSchema = z
  .string({
    message: 'Password can not be empty.',
  })
  .regex(/^.{8,20}$/, {
    message: 'Minimum 8 and maximum 20 characters.',
  })
  .regex(/(?=.*[A-Z])/, {
    message: 'At least one uppercase character.',
  })
  .regex(/(?=.*[a-z])/, {
    message: 'At least one lowercase character.',
  })
  .regex(/(?=.*\d)/, {
    message: 'At least one digit.',
  })
  .regex(/[$&+,:;=?@#|'<>.^*()%!-]/, {
    message: 'At least one special character.',
  });

export const SignUpFormSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    password2: passwordSchema,
  })
  .refine(({ password, password2 }) => password === password2, {
    path: ['password2'],
    message: "Password didn't match.",
  });

export const SignInFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const UsernameFormSchema = z.object({
  name: nameSchema,
});

export const ResetPasswordFormSchema = z
  .object({
    password: passwordSchema,
    password2: passwordSchema,
  })
  .refine(({ password, password2 }) => password === password2, {
    path: ['password2'],
    message: "Password didn't match.",
  });
