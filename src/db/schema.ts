import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  char,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return "citext";
  },
});

export const DOCUMENT_STATUSES = [
  "queued",
  "extracting",
  "analyzing",
  "ready",
  "failed",
] as const;

export const ANALYSIS_STATUSES = ["pending", "complete", "failed"] as const;

export const MESSAGE_ROLES = ["user", "assistant"] as const;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: citext("email").notNull(),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("accounts_user_id_idx").on(account.userId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [index("sessions_user_id_idx").on(session.userId)]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: char("sha256", { length: 64 }).notNull(),
    storagePath: text("storage_path").notNull(),
    status: text("status").notNull().default("queued"),
    errorCode: text("error_code"),
    pageCount: integer("page_count"),
    charCount: integer("char_count"),
    isScanned: boolean("is_scanned").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    processingStartedAt: timestamp("processing_started_at", {
      mode: "date",
      withTimezone: true,
    }),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (doc) => [
    check("documents_mime_type_check", sql`${doc.mimeType} = 'application/pdf'`),
    check(
      "documents_size_bytes_check",
      sql`${doc.sizeBytes} <= 20971520 AND ${doc.sizeBytes} > 0`
    ),
    check(
      "documents_status_check",
      sql`${doc.status} IN ('queued', 'extracting', 'analyzing', 'ready', 'failed')`
    ),
    check("documents_sha256_check", sql`char_length(${doc.sha256}) = 64`),
    uniqueIndex("documents_storage_path_key").on(doc.storagePath),
    index("documents_user_created_idx").on(doc.userId, doc.createdAt.desc()),
    index("documents_user_sha_idx").on(doc.userId, doc.sha256),
    index("documents_active_status_idx")
      .on(doc.status)
      .where(sql`${doc.status} != 'ready'`),
  ]
);

export const documentPages = pgTable(
  "document_pages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    text: text("text").notNull(),
  },
  (page) => [
    check("document_pages_page_number_check", sql`${page.pageNumber} >= 1`),
    uniqueIndex("document_pages_doc_page_key").on(
      page.documentId,
      page.pageNumber
    ),
  ]
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    modelId: text("model_id").notNull(),
    status: text("status").notNull().default("pending"),
    result: jsonb("result").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    summaryText: text("summary_text"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (analysis) => [
    check(
      "analyses_status_check",
      sql`${analysis.status} IN ('pending', 'complete', 'failed')`
    ),
    uniqueIndex("analyses_document_key").on(analysis.documentId),
  ]
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (conversation) => [
    uniqueIndex("conversations_document_key").on(conversation.documentId),
    index("conversations_user_idx").on(conversation.userId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    sources: jsonb("sources").notNull().default([]),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (message) => [
    check("messages_role_check", sql`${message.role} IN ('user', 'assistant')`),
    index("messages_conversation_created_idx").on(
      message.conversationId,
      message.createdAt
    ),
  ]
);

export type User = typeof users.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentPage = typeof documentPages.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
