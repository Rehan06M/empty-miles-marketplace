
import type { UserRole, UserStatus } from "../generated/prisma/enums.js";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
};

export function toPublicUser(
  user: PublicUser
): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}
