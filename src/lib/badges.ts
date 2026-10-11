// Hệ thống huy hiệu - tính toán từ stats hiện có (không cần bảng riêng cho MVP)
import { Award, BookOpen, Flame, Swords, Trophy, Target, Sparkles, Crown } from "lucide-react";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: any;
  gradient: string; // tailwind classes
  check: (s: BadgeStats) => boolean;
}

export interface BadgeStats {
  lessonsCompleted: number;
  dungeonsCompleted: number;
  perfectDungeons: number;
  streakLongest: number;
  xpTotal: number;
  level: number;
  duelsWon: number;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first_lesson",
    name: "Bước đầu tiên",
    description: "Hoàn thành bài học đầu tiên",
    icon: BookOpen,
    gradient: "from-emerald-400 to-emerald-600",
    check: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "ten_lessons",
    name: "Học trò chăm chỉ",
    description: "Hoàn thành 10 bài học",
    icon: Award,
    gradient: "from-indigo-400 to-indigo-600",
    check: (s) => s.lessonsCompleted >= 10,
  },
  {
    id: "fifty_lessons",
    name: "Bậc thầy chuyên cần",
    description: "Hoàn thành 50 bài học",
    icon: Crown,
    gradient: "from-amber-400 to-amber-600",
    check: (s) => s.lessonsCompleted >= 50,
  },
  {
    id: "streak_3",
    name: "Nhen lửa",
    description: "Chuỗi 3 ngày liên tục",
    icon: Flame,
    gradient: "from-orange-400 to-red-500",
    check: (s) => s.streakLongest >= 3,
  },
  {
    id: "streak_7",
    name: "Lửa rực cháy",
    description: "Chuỗi 7 ngày liên tục",
    icon: Flame,
    gradient: "from-red-500 to-pink-600",
    check: (s) => s.streakLongest >= 7,
  },
  {
    id: "streak_30",
    name: "Ngọn lửa bất diệt",
    description: "Chuỗi 30 ngày liên tục",
    icon: Flame,
    gradient: "from-fuchsia-500 to-purple-700",
    check: (s) => s.streakLongest >= 30,
  },
  {
    id: "first_dungeon",
    name: "Chiến binh đầu tiên",
    description: "Hoàn thành phó bản đầu tiên",
    icon: Swords,
    gradient: "from-slate-400 to-slate-600",
    check: (s) => s.dungeonsCompleted >= 1,
  },
  {
    id: "perfect_dungeon",
    name: "Phó bản hoàn hảo",
    description: "Đạt 3/3 điểm tuyệt đối trong phó bản",
    icon: Target,
    gradient: "from-emerald-400 to-teal-600",
    check: (s) => s.perfectDungeons >= 1,
  },
  {
    id: "xp_500",
    name: "500 XP",
    description: "Tích lũy 500 XP",
    icon: Sparkles,
    gradient: "from-yellow-400 to-amber-500",
    check: (s) => s.xpTotal >= 500,
  },
  {
    id: "xp_2000",
    name: "2000 XP",
    description: "Tích lũy 2000 XP",
    icon: Trophy,
    gradient: "from-yellow-500 to-orange-600",
    check: (s) => s.xpTotal >= 2000,
  },
  {
    id: "level_10",
    name: "Cấp 10",
    description: "Đạt cấp độ 10",
    icon: Award,
    gradient: "from-indigo-500 to-violet-700",
    check: (s) => s.level >= 10,
  },
  {
    id: "first_duel_win",
    name: "Chiến thắng đầu tiên",
    description: "Thắng trận đấu PvP đầu tiên",
    icon: Swords,
    gradient: "from-rose-500 to-red-700",
    check: (s) => s.duelsWon >= 1,
  },
];

export function computeEarnedBadges(stats: BadgeStats): BadgeDef[] {
  return BADGES.filter((b) => b.check(stats));
}
