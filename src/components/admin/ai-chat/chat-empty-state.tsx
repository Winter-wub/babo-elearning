import { Bot, Users, Video, BarChart3, HelpCircle } from "lucide-react";

interface ChatEmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

interface HelpCategory {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  suggestions: string[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    icon: Users,
    title: "ข้อมูลผู้ใช้",
    description: "ถามเกี่ยวกับนักเรียน สถิติการลงทะเบียน",
    suggestions: [
      "มีนักเรียนกี่คนที่ลงทะเบียนสัปดาห์นี้?",
      "แสดงยอดผู้ใช้ใหม่ 30 วันที่ผ่านมา",
    ],
  },
  {
    icon: Video,
    title: "วิดีโอและคอร์ส",
    description: "ถามเกี่ยวกับวิดีโอ เพลย์ลิสต์ ยอดชม",
    suggestions: [
      "คอร์สไหนมีผู้เรียนมากที่สุด?",
      "วิดีโอยอดนิยม 10 อันดับแรก",
    ],
  },
  {
    icon: BarChart3,
    title: "สิทธิ์และสถิติ",
    description: "ถามเกี่ยวกับสิทธิ์การเข้าถึง ลิงก์เชิญ",
    suggestions: [
      "สรุปสิทธิ์ที่ให้ล่าสุด",
      "มีลิงก์เชิญที่ใช้งานได้กี่ลิงก์?",
    ],
  },
];

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8">
      {/* Header */}
      <div className="text-center">
        <Bot className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-3 text-lg font-semibold">AI Assistant</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          ช่วยคุณดูข้อมูลแพลตฟอร์ม วิเคราะห์นักเรียน และตอบคำถามเกี่ยวกับคอร์ส
        </p>
      </div>

      {/* How to use */}
      <div className="w-full max-w-2xl rounded-xl border bg-muted/30 px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          วิธีใช้งาน
        </div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>- พิมพ์คำถามภาษาไทยหรืออังกฤษแล้วกด Enter เพื่อส่ง</li>
          <li>- AI จะดึงข้อมูลจริงจากระบบมาตอบ (ผู้ใช้ วิดีโอ สิทธิ์ ฯลฯ)</li>
          <li>- คลิกคำถามตัวอย่างด้านล่างเพื่อเริ่มต้นได้เลย</li>
          <li>- ประวัติการสนทนาจะบันทึกไว้ที่แถบด้านซ้าย</li>
        </ul>
      </div>

      {/* Category cards */}
      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {HELP_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.title}
              className="flex flex-col gap-2 rounded-xl border p-4"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{cat.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{cat.description}</p>
              <div className="mt-auto flex flex-col gap-1.5 pt-1">
                {cat.suggestions.map((text) => (
                  <button
                    key={text}
                    onClick={() => onSuggestionClick(text)}
                    className="rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
