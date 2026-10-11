import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/courses")({
  component: Courses,
});

function Courses() {
  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Khóa học</h1>
        <p className="text-muted-foreground mt-1">Phần khóa học đang để trống.</p>
      </div>

      <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
        <BookOpen className="size-8 mx-auto text-muted-foreground" />
        <p className="mt-3 font-medium">Chưa có nội dung khóa học</p>
        <p className="text-sm text-muted-foreground mt-1">Mục này dành cho người phụ trách khóa học.</p>
      </div>
    </div>
  );
}
