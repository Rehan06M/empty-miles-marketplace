
import { z } from "zod";

const emailSchema = z.email().max(254).transform(
  (value) => value.trim().toLowerCase()
);

const passwordSchema = z.string()
  .min(8, "Password must have at least 8 characters")
  .max(72, "Password must not exceed 72 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number");

export const registerSchema = z.strictObject({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  companyName: z.string().trim().min(2).max(150),
  role: z.enum(["SHIPPER", "CARRIER"]),
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
