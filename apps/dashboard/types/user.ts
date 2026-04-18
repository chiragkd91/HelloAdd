export type UserRole = "OWNER" | "ADMIN" | "MEMBER";

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
};
