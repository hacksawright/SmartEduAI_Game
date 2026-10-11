import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_app/forum")({
  component: Forum,
});

function Forum() {
  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
        <MessageCircle className="size-7 text-primary" /> Thảo luận
      </h1>
      <p className="text-muted-foreground mt-1">Tham gia thảo luận trực tiếp trong từng bài học.</p>
      <div className="mt-8 p-12 text-center bg-card border border-border rounded-2xl">
        <div className="text-5xl mb-3">💬</div>
        <h3 className="font-semibold">Diễn đàn theo bài học</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Mở một bài học bất kỳ, bạn sẽ thấy phần thảo luận ở cuối trang. Hãy chia sẻ mẹo và đặt câu hỏi cho bạn cùng lớp!
        </p>
      </div>
    </div>
  );
}
