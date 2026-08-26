CREATE TABLE "rate_limit_windows" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limit_windows_key_window_start_pk" PRIMARY KEY("key","window_start"),
	CONSTRAINT "rate_limit_count_check" CHECK ("rate_limit_windows"."count" >= 0)
);
