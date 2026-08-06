import { useEffect, useState } from "react";
import { CommentEditor, type CommentEditorProps } from "./comment-editor";

/**
 * Lazy-loads the TipTap-based CommentEditor.
 *
 * @tiptap/react + ProseMirror are heavy (~hundreds of KB) and used only when a
 * signed-in user actually writes a comment, so they should not ship in the
 * critical path of public post pages. SSR renders a lightweight skeleton; the
 * editor chunk is fetched on the client after hydration.
 */
export function LazyCommentEditor(props: CommentEditorProps) {
  const [Editor, setEditor] = useState<typeof CommentEditor | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("./comment-editor").then((m) => {
      if (!cancelled) setEditor(() => m.CommentEditor);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Editor) {
    return (
      <div className="min-h-[120px] flex items-center justify-center border border-border/40 bg-muted/10">
        <div className="w-5 h-5 rounded-none border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    );
  }

  return <Editor {...props} />;
}
