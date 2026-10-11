import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Pin, Send, Lightbulb, HelpCircle } from "lucide-react";
import { relativeTimeVi } from "@/lib/math-utils";
import { toast } from "sonner";

type PostType = "tip" | "question" | "feedback_to_peer";

interface Post {
  id: string;
  student_id: string;
  content_text: string;
  post_type: PostType;
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
  parent_post_id: string | null;
  author?: { full_name: string | null; avatar_url: string | null } | null;
  liked?: boolean;
}

export function LessonForum({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("tip");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("forum_posts")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data ?? []) as Post[];
    // attach author profiles
    const ids = Array.from(new Set(list.map((p) => p.student_id)));
    let profMap: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ids);
      profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }
    // attach my likes
    let likedSet = new Set<string>();
    if (user && list.length > 0) {
      const { data: rx } = await supabase
        .from("forum_reactions")
        .select("post_id")
        .eq("student_id", user.id)
        .in("post_id", list.map((p) => p.id));
      likedSet = new Set((rx ?? []).map((r: any) => r.post_id));
    }
    setPosts(list.map((p) => ({ ...p, author: profMap[p.student_id], liked: likedSet.has(p.id) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime: subscribe to new posts
    const channel = supabase
      .channel(`forum-${lessonId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "forum_posts", filter: `lesson_id=eq.${lessonId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user?.id]);

  const submit = async () => {
    if (!user || !content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("forum_posts").insert({
      lesson_id: lessonId,
      student_id: user.id,
      content_text: content.trim(),
      post_type: postType,
    });
    setSubmitting(false);
    if (error) { toast.error("Không gửi được bài"); return; }
    setContent("");
    toast.success("Đã đăng!");
    load();
  };

  const toggleLike = async (post: Post) => {
    if (!user) return;
    if (post.liked) {
      await supabase.from("forum_reactions").delete()
        .eq("post_id", post.id).eq("student_id", user.id);
      await supabase.from("forum_posts").update({ likes_count: Math.max(0, post.likes_count - 1) }).eq("id", post.id);
    } else {
      await supabase.from("forum_reactions").insert({
        post_id: post.id, student_id: user.id, reaction_type: "like",
      });
      await supabase.from("forum_posts").update({ likes_count: post.likes_count + 1 }).eq("id", post.id);
    }
    setPosts((prev) => prev.map((p) => p.id === post.id ? {
      ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1,
    } : p));
  };

  const typeChip = (t: PostType) => {
    if (t === "tip") return { label: "Mẹo", icon: Lightbulb, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
    if (t === "question") return { label: "Câu hỏi", icon: HelpCircle, cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
    return { label: "Trả lời", icon: MessageCircle, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  };

  return (
    <section className="mt-10 p-5 md:p-6 rounded-2xl bg-card border border-border">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" /> Thảo luận bài học
      </h2>
      <p className="text-sm text-muted-foreground mt-1">Chia sẻ mẹo, đặt câu hỏi cho bạn cùng lớp.</p>

      {/* Composer */}
      <div className="mt-4 p-3 rounded-xl bg-secondary/40 border border-border">
        <div className="flex gap-1.5 mb-2">
          {(["tip", "question", "feedback_to_peer"] as PostType[]).map((t) => {
            const c = typeChip(t);
            return (
              <button key={t} onClick={() => setPostType(t)}
                className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${postType === t ? c.cls : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                <c.icon className="size-3 inline mr-1" />{c.label}
              </button>
            );
          })}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ điều bạn vừa học, một mẹo, hay câu hỏi…"
          className="min-h-[80px] resize-none bg-background"
          maxLength={1000}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{content.length}/1000</span>
          <Button size="sm" onClick={submit} disabled={!content.trim() || submitting} className="bg-gradient-primary">
            <Send className="size-3.5 mr-1" /> Đăng
          </Button>
        </div>
      </div>

      {/* Posts */}
      <div className="mt-5 space-y-3">
        {loading && <div className="text-sm text-muted-foreground text-center py-6">Đang tải…</div>}
        {!loading && posts.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <div className="text-3xl mb-1">💬</div>
            Chưa có bình luận. Hãy là người đầu tiên!
          </div>
        )}
        {posts.map((p) => {
          const c = typeChip(p.post_type);
          return (
            <article key={p.id} className="p-4 rounded-xl bg-background border border-border">
              <header className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-gradient-primary text-primary-foreground font-bold flex items-center justify-center shrink-0">
                  {p.author?.full_name?.trim()?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{p.author?.full_name?.trim() || "Học sinh"}</span>
                    {p.is_pinned && <Pin className="size-3 text-primary" />}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.cls}`}>
                      <c.icon className="size-2.5 inline mr-0.5" />{c.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{relativeTimeVi(p.created_at)}</div>
                </div>
              </header>
              <div className="mt-2 text-sm whitespace-pre-wrap">{p.content_text}</div>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => toggleLike(p)}
                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${p.liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"}`}>
                  <Heart className={`size-3.5 ${p.liked ? "fill-current" : ""}`} />
                  {p.likes_count}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
