import { redirect } from "next/navigation";

/** Kept so links shared before the rename still land somewhere. */
export default function MineRedirect() {
  redirect("/quizzes");
}
