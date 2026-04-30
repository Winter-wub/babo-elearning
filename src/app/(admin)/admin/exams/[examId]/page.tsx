import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { StandaloneExamEditor } from "@/components/admin/standalone-exam-editor";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { examId } = await params;
  const exam = await db.exercise.findUnique({
    where: { id: examId, type: "STANDALONE" },
    select: { title: true },
  });
  return { title: exam?.title ?? "แก้ไขแบบทดสอบ" };
}

export default async function AdminExamDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") notFound();

  const { examId } = await params;

  const exam = await db.exercise.findUnique({
    where: { id: examId, type: "STANDALONE" },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      _count: { select: { attempts: true } },
    },
  });

  if (!exam) notFound();

  return <StandaloneExamEditor exam={exam} />;
}
