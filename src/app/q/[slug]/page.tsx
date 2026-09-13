import type { Metadata } from "next";
import { currentUserId } from "@/auth";
import { notFound } from "next/navigation";
import Leaderboard from "@/components/Leaderboard";
import RunHistory, { type TroubleQuestion } from "@/components/RunHistory";
import QuizRunner from "@/components/QuizRunner";
import SaveButton from "@/components/SaveButton";
import SetupNotice from "@/components/SetupNotice";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { cardKeysFor } from "@/lib/cardKey";
import {
  getActiveRunners,
  getLeaderboard,
  getQuizBySlug,
  getQuizStats,
  countPlayers,
  getRunFor,
  isSaved,
  listRunsFor,
  listTroubleSpots,
} from "@/lib/quizzes";

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

    const userId = await currentUserId();
    const [stats, board, active, saved, savedRun, runs, spots, players] = await Promise.all([
      getQuizStats(quiz.id),
      getLeaderboard(quiz.id),
      getActiveRunners(quiz.id),
      userId ? isSaved(userId, quiz.id) : Promise.resolve(false),
      userId ? getRunFor(userId, quiz.id) : Promise.resolve(null),
      userId ? listRunsFor(userId, quiz.id) : Promise.resolve([]),
      userId ? listTroubleSpots(userId, quiz.id) : Promise.resolve([]),
      countPlayers(quiz.id),
    ]);

    // Trouble spots come back keyed by card, so put the question text back on.
    const keys = cardKeysFor(quiz.questions.map((question) => question.text));
    const textByKey = new Map(keys.map((key, i) => [key, quiz.questions[i].text]));
    const trouble: TroubleQuestion[] = spots.flatMap((spot) => {
      const text = textByKey.get(spot.cardKey);
      return text ? [{ text, wrong: spot.wrong, seen: spot.seen }] : [];
    });

    return (
      <div className="screen screen-narrow">
        <QuizRunner
          title={quiz.title}
          questions={quiz.questions}
          slug={quiz.slug}
          footnote={takenLine(stats.attempts, stats.averagePercent)}
          headerAction={
            <SaveButton slug={quiz.slug} signedIn={Boolean(userId)} initialSaved={saved} />
          }
          aside={
            <Leaderboard
              rows={board}
              active={active.filter((r) => r.userId !== userId)}
              meId={userId}
              totalPlayers={players}
            />
          }
          savedRun={savedRun}
          report={<RunHistory runs={runs} trouble={trouble} signedIn={Boolean(userId)} />}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return <SetupNotice />;
    throw error;
  }
}
