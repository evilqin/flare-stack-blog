import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  CreateSeriesInputSchema,
  DeleteSeriesInputSchema,
  UpdateSeriesInputSchema,
} from "@/features/series/series.schema";
import * as SeriesService from "@/features/series/series.service";
import { adminMiddleware, dbMiddleware } from "@/lib/middlewares";

// ── Public API ───────────────────────────────────────────────

export const getPublicSeriesListFn = createServerFn()
  .middleware([dbMiddleware])
  .handler(async ({ context }) => {
    return await SeriesService.getPublicSeriesList(context);
  });

export const getSeriesWithPostsFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ seriesId: z.number() }))
  .handler(async ({ data, context }) => {
    return await SeriesService.getSeriesWithPosts(context, data.seriesId);
  });

export const getSeriesByPostIdFn = createServerFn()
  .middleware([dbMiddleware])
  .inputValidator(z.object({ postId: z.number() }))
  .handler(async ({ data, context }) => {
    return await SeriesService.getSeriesByPostId(context, data.postId);
  });

// ── Admin API ────────────────────────────────────────────────

export const getAllSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return await SeriesService.getAllSeriesForAdmin(context);
  });

export const createSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(CreateSeriesInputSchema)
  .handler(async ({ data, context }) => {
    return await SeriesService.createSeries(context, data);
  });

export const updateSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(UpdateSeriesInputSchema)
  .handler(async ({ data, context }) => {
    return await SeriesService.updateSeries(context, data);
  });

export const deleteSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(DeleteSeriesInputSchema)
  .handler(async ({ data, context }) => {
    return await SeriesService.deleteSeries(context, data);
  });

export const assignPostToSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      postId: z.number(),
      seriesId: z.number(),
      order: z.number().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    return await SeriesService.assignPostToSeries(
      context,
      data.postId,
      data.seriesId,
      data.order,
    );
  });

export const removePostFromSeriesFn = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      postId: z.number(),
      seriesId: z.number(),
    }),
  )
  .handler(async ({ data, context }) => {
    return await SeriesService.removePostFromSeries(
      context,
      data.postId,
      data.seriesId,
    );
  });
