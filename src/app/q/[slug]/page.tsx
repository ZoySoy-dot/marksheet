import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QuizRunner from "@/components/QuizRunner";
import SetupNotice from "@/components/SetupNotice";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getQuizBySlug, getQuizStats } from "@/lib/quizzes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const quiz = await getQuizBySlug(slug);
    if (!quiz) return { title: "Sheet not found" };
    return {
      title: quiz.title,
      description: `${quiz.questionCount} question${quiz.questionCount === 1 ? "" : "s"}. Take it on Marksheet.`,
    };
  } catch {
    return { title: "Sheet" };
  }
}

function takenLine(attempts: number, averagePercent: number): string | undefined {
  if (attempts < 1) return undefined;
  return `Taken ${attempts} time${attempts === 1 ? "" : "s"}. Average score ${averagePercent}%.`;
}

export default async function QuizPage({ params }: Props) {
  const { slug } = await params;

  try {
    const quiz = await getQuizBySlug(slug);
    if (!quiz) notFound();

    const stats = await getQuizStats(quiz.id);

    return (
      <div className="screen screen-narrow">
        <QuizRunner
          title={quiz.title}
          questions={quiz.questions}
          slug={quiz.slug}
          footnote={takenLine(stats.attempts, stats.averagePercent)}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return <SetupNotice />;
    throw error;
  }
}
