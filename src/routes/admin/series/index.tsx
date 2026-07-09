import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import type { SeriesSelect } from "@/features/series/series.schema";
import {
  createSeriesFn,
  deleteSeriesFn,
  getAllSeriesFn,
  updateSeriesFn,
} from "@/features/series/api/series.api";

interface SeriesWithCount extends SeriesSelect {
  postCount: number;
}

export const Route = createFileRoute("/admin/series/")({
  ssr: "data-only",
  component: SeriesAdminPage,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery({
      queryKey: ["series", "admin-list"],
      queryFn: () => getAllSeriesFn(),
    });
    return { title: "Series" };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

const SERIES_LIST_QUERY = {
  queryKey: ["series", "admin-list"],
  queryFn: () => getAllSeriesFn(),
};

function SeriesAdminPage() {
  const queryClient = useQueryClient();
  const { data: seriesList = [], isLoading } = useQuery<Array<SeriesWithCount>>(SERIES_LIST_QUERY);

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      coverUrl?: string;
    }) => createSeriesFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series created");
      resetForm();
      setShowCreate(false);
    },
    onError: () => toast.error("Failed to create series"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: {
      id: number;
      data: {
        name: string;
        description?: string | null;
        coverUrl?: string | null;
      };
    }) => updateSeriesFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series updated");
      resetForm();
      setEditId(null);
    },
    onError: () => toast.error("Failed to update series"),
  });

  const deleteMutation = useMutation({
    mutationFn: (data: { id: number }) => deleteSeriesFn({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      toast.success("Series deleted");
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete series"),
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setCoverUrl("");
  };

  const startEdit = (series: (typeof seriesList)[0]) => {
    setEditId(series.id);
    setName(series.name);
    setDescription(series.description ?? "");
    setCoverUrl(series.coverUrl ?? "");
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (editId) {
      updateMutation.mutate({
        id: editId,
        data: {
          name: name.trim(),
          description: description.trim() || null,
          coverUrl: coverUrl.trim() || null,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-medium">Series</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize posts into series/collections
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowCreate(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={14} />
          <span>New Series</span>
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editId !== null) && (
        <div className="border border-border/30 rounded-sm p-4 space-y-4 bg-muted/10">
          <h3 className="text-sm font-mono uppercase tracking-wider">
            {editId ? "Edit Series" : "New Series"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. React Tutorial Series"
                className="w-full px-3 py-2 text-sm border border-border/30 bg-transparent focus:outline-none focus:border-foreground/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the series"
                className="w-full px-3 py-2 text-sm border border-border/30 bg-transparent focus:outline-none focus:border-foreground/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                Cover URL
              </label>
              <input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-border/30 bg-transparent focus:outline-none focus:border-foreground/50 transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => {
                resetForm();
                setShowCreate(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              {editId ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {/* Series List */}
      <div className="space-y-2">
        {seriesList.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/60">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-mono">
              No series yet. Create your first series!
            </p>
          </div>
        ) : (
          seriesList.map((series) => (
            <div
              key={series.id}
              className="flex items-center justify-between px-4 py-3 border border-border/20 hover:border-border/60 transition-colors group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <BookOpen
                  size={16}
                  className="shrink-0 text-muted-foreground/40"
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {series.name}
                  </div>
                  {series.description && (
                    <div className="text-xs text-muted-foreground/60 truncate mt-0.5">
                      {series.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground/40">
                  {series.postCount ?? 0} posts
                </span>
                <button
                  onClick={() => startEdit(series)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setDeleteId(series.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMutation.mutate({ id: deleteId! })}
        title="Delete Series"
        message="Are you sure you want to delete this series? Posts in this series will not be deleted, but the grouping will be removed."
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
