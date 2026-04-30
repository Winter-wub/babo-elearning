import { getStandaloneExams } from "@/actions/exam.actions";
import { ExamListPage } from "@/components/admin/exam-list-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "จัดการแบบทดสอบ",
};

export default async function AdminExamsPage() {
  const result = await getStandaloneExams();
  const exams = result.success ? result.data : [];

  return <ExamListPage exams={exams} />;
}
