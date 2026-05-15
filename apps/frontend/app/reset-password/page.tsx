// apps/frontend/app/reset-password/page.tsx
import { redirect } from "next/navigation";

export default function ResetPasswordRootPage() {
  // Si quelqu'un arrive ici sans token, on le renvoie au début du flux
  redirect("/forgot-password");
}