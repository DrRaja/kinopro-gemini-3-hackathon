import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  videoFilename: text("video_filename").notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  posterUrl: text("poster_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const storyboards = sqliteTable("storyboards", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  targetLength: text("target_length").notNull(),
  tone: text("tone").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  storyboardId: text("storyboard_id").notNull(),
  sceneNumber: integer("scene_number").notNull(),
  startTc: text("start_tc").notNull(),
  endTc: text("end_tc").notNull(),
  durationSeconds: real("duration_seconds").notNull(),
  thumbnailTc: text("thumbnail_tc").notNull(),
  description: text("description").notNull(),
  emotionalBeat: text("emotional_beat").notNull(),
  musicIdea: text("music_idea").notNull(),
  cameraMove: text("camera_move").notNull(),
  shotType: text("shot_type").notNull(),
  clipPath: text("clip_path"),
  thumbnailPath: text("thumbnail_path"),
});

export const exports = sqliteTable("exports", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  format: text("format").notNull(),
  status: text("status").notNull(),
  payload: text("payload"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  stage: text("stage").notNull(),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
