import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const courses = sqliteTable("campus_courses", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), name: text("name").notNull(),
  schoolUrl: text("school_url").notNull(), externalId: text("external_id").notNull().default(""),
  term: text("term").notNull().default(""), lmsType: text("lms_type").notNull().default("other"),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [index("campus_courses_owner").on(table.ownerId)]);

export const materials = sqliteTable("campus_materials", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), courseId: text("course_id").notNull(),
  title: text("title").notNull(), kind: text("kind").notNull(), fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(), bytes: integer("bytes").notNull(), characters: integer("characters").notNull(),
  objectKey: text("object_key").notNull(), textKey: text("text_key").notNull(),
  sourceSha: text("source_sha").notNull(), textSha: text("text_sha").notNull(),
  sourceUrl: text("source_url").notNull().default(""), extractionStatus: text("extraction_status").notNull(),
  createdAt: text("created_at").notNull(),
}, table => [index("campus_materials_owner_course").on(table.ownerId, table.courseId)]);

export const assignments = sqliteTable("campus_assignments", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), courseId: text("course_id").notNull(),
  externalId: text("external_id").notNull().default(""), title: text("title").notNull(),
  instructions: text("instructions").notNull().default(""), rubric: text("rubric").notNull().default(""),
  dueAt: text("due_at").notNull().default(""), chapter: text("chapter").notNull().default(""),
  materialIds: text("material_ids").notNull().default("[]"), sourceUrl: text("source_url").notNull().default(""),
  revision: text("revision").notNull().default(""), status: text("status").notNull().default("NotStarted"),
  updatedAt: text("updated_at").notNull(),
}, table => [index("campus_assignments_owner_course").on(table.ownerId, table.courseId)]);

export const outputs = sqliteTable("campus_outputs", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), courseId: text("course_id").notNull(),
  assignmentId: text("assignment_id"), title: text("title").notNull(), mode: text("mode").notNull(),
  body: text("body").notNull(), sources: text("sources").notNull(), gaps: text("gaps").notNull(),
  model: text("model").notNull(), status: text("status").notNull().default("ReadyForReview"),
  complete: integer("complete").notNull().default(1), createdAt: text("created_at").notNull(),
}, table => [index("campus_outputs_owner_course").on(table.ownerId, table.courseId)]);

export const settings = sqliteTable("campus_settings", {
  ownerId: text("owner_id").primaryKey(), model: text("model").notNull().default("{}"),
  modelSecret: text("model_secret"), canvas: text("canvas").notNull().default("{}"),
  canvasSecret: text("canvas_secret"), updatedAt: text("updated_at").notNull(),
});
export const jobs = sqliteTable("campus_jobs", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull(), courseId: text("course_id").notNull(),
  requestId: text("request_id").notNull(), fingerprint: text("fingerprint").notNull(),
  status: text("status").notNull(), payload: text("payload").notNull(), outputId: text("output_id").notNull(),
  retryOf: text("retry_of"), leaseUntil: integer("lease_until").notNull(), error: text("error").notNull().default(""),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("campus_jobs_request").on(table.ownerId, table.requestId), index("campus_jobs_owner_course").on(table.ownerId, table.courseId)]);


export const lmsSnapshots = sqliteTable("campus_lms_snapshots", {
  courseId: text("course_id").primaryKey(), ownerId: text("owner_id").notNull(),
  snapshot: text("snapshot").notNull(), updatedAt: text("updated_at").notNull(),
}, table => [index("campus_lms_snapshots_owner").on(table.ownerId)]);

export const onboarding = sqliteTable("campus_onboarding", {
  ownerId: text("owner_id").primaryKey(), mode: text("mode").notNull().default("ai"),
  step: integer("step").notNull().default(0), courseDeferred: integer("course_deferred").notNull().default(0),
  completedAt: text("completed_at"), updatedAt: text("updated_at").notNull(),
});
