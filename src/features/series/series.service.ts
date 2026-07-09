import { z } from "zod";
import * as CacheService from "@/features/cache/cache.service";
import * as SeriesRepo from "@/features/series/data/series.data";
import type {
  CreateSeriesInput,
  DeleteSeriesInput,
  UpdateSeriesInput,
} from "@/features/series/series.schema";
import {
  SeriesSelectSchema,
  SeriesWithPostsSchema,
} from "@/features/series/series.schema";
import { err, ok } from "@/lib/errors";

const SERIES_CACHE_NAMESPACE = "series:list";

export async function getAllSeries(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return await CacheService.get(
    context,
    ["series", "list"],
    SeriesSelectSchema.array(),
    () => SeriesRepo.getAllSeries(context.db),
    { ttl: "7d" },
  );
}

export async function getSeriesWithPosts(
  context: DbContext & { executionCtx: ExecutionContext },
  seriesId: number,
) {
  return await CacheService.get(
    context,
    ["series", "detail", seriesId],
    SeriesWithPostsSchema.nullable(),
    () => SeriesRepo.getSeriesWithPosts(context.db, seriesId),
    { ttl: "7d" },
  );
}

export async function getSeriesByPostId(
  context: DbContext & { executionCtx: ExecutionContext },
  postId: number,
) {
  return await SeriesRepo.getSeriesByPostId(context.db, postId);
}

export async function getPublicSeriesList(
  context: DbContext & { executionCtx: ExecutionContext },
) {
  return await CacheService.get(
    context,
    ["series", "public-list"],
    SeriesSelectSchema.extend({ postCount: z.number() }).array(),
    () => SeriesRepo.getPublicSeriesList(context.db),
    { ttl: "7d" },
  );
}

// ── Admin ────────────────────────────────────────────────────

export async function getAllSeriesForAdmin(context: DbContext) {
  return await SeriesRepo.getAllSeries(context.db);
}

export async function createSeries(
  context: DbContext & { executionCtx: ExecutionContext },
  data: CreateSeriesInput,
) {
  const existing = await SeriesRepo.findSeriesByName(context.db, data.name);
  if (existing) {
    return err({ reason: "SERIES_NAME_ALREADY_EXISTS" });
  }

  const series = await SeriesRepo.createSeries(context.db, {
    name: data.name,
    description: data.description ?? null,
    coverUrl: data.coverUrl ?? null,
    order: data.order ?? 0,
  });

  await CacheService.bumpVersion(context, SERIES_CACHE_NAMESPACE);
  return ok(series);
}

export async function updateSeries(
  context: DbContext & { executionCtx: ExecutionContext },
  data: UpdateSeriesInput,
) {
  const series = await SeriesRepo.findSeriesById(context.db, data.id);
  if (!series) {
    return err({ reason: "SERIES_NOT_FOUND" });
  }

  const updated = await SeriesRepo.updateSeries(context.db, data.id, data.data);
  await CacheService.bumpVersion(context, SERIES_CACHE_NAMESPACE);
  return ok(updated);
}

export async function deleteSeries(
  context: DbContext & { executionCtx: ExecutionContext },
  data: DeleteSeriesInput,
) {
  const series = await SeriesRepo.findSeriesById(context.db, data.id);
  if (!series) {
    return err({ reason: "SERIES_NOT_FOUND" });
  }

  await SeriesRepo.deleteSeries(context.db, data.id);
  await CacheService.bumpVersion(context, SERIES_CACHE_NAMESPACE);
  return ok({ success: true });
}

export async function assignPostToSeries(
  context: DbContext & { executionCtx: ExecutionContext },
  postId: number,
  seriesId: number,
  order?: number,
) {
  const result = await SeriesRepo.assignPostToSeries(
    context.db,
    postId,
    seriesId,
    order,
  );
  await CacheService.bumpVersion(context, SERIES_CACHE_NAMESPACE);
  return result;
}

export async function removePostFromSeries(
  context: DbContext & { executionCtx: ExecutionContext },
  postId: number,
  seriesId: number,
) {
  await SeriesRepo.removePostFromSeries(context.db, postId, seriesId);
  await CacheService.bumpVersion(context, SERIES_CACHE_NAMESPACE);
}
