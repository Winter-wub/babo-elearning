import { notFound } from "next/navigation";
import { getExamMetadata, getExamAttemptHistory } from "@/actions/exam.actions";
import { ExamPage } from "@/components/exam/exam-page";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examId } = await params;
  const exam = await getExamMetadata(examId);
  return {
    title: exam?.title ?? "แบบทดสอบ",
  };
}

export default async function ExamDetailPage({ params }: Props) {
  const { examId } = await params;
  const [exam, attempts] = await Promise.all([
    getExamMetadata(examId),
    getExamAttemptHistory(examId),
  ]);

  if (!exam) notFound();

  return (
    <ExamPage
      examId={exam.id}
      title={exam.title}
      description={exam.description}
      passingScore={exam.passingScore}
      maxAttempts={exam.maxAttempts}
      questionCount={exam._count.questions}
      attempts={attempts}
    />
  );
}
