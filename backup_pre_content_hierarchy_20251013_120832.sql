--
-- PostgreSQL database dump
--

\restrict TszXGysway5bpznRYpROCjXcmNwNbfg8ZHuhqbpdGDgNC33Nq328PpSJH5Fzete

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg12+1)
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: cerply_app
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO cerply_app;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: cerply_app
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO cerply_app;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: cerply_app
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO cerply_app;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: cerply_app
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO cerply_app;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: cerply_app
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: attempts; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text,
    item_id uuid NOT NULL,
    answer_index integer,
    answer_text text,
    correct integer NOT NULL,
    time_ms integer,
    channel text DEFAULT 'web'::text,
    partial_credit numeric(3,2),
    feedback text,
    validation_method text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.attempts OWNER TO cerply_app;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    user_id text NOT NULL,
    organization_id text,
    performed_by text,
    request_id text,
    metadata jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_events OWNER TO cerply_app;

--
-- Name: TABLE audit_events; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.audit_events IS 'Epic 7: Persistent audit trail for compliance and observability (180-day retention)';


--
-- Name: COLUMN audit_events.occurred_at; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON COLUMN public.audit_events.occurred_at IS 'Timestamp when the event occurred (indexed for cleanup)';


--
-- Name: badges; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.badges OWNER TO cerply_app;

--
-- Name: TABLE badges; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.badges IS 'Epic 7: Achievement badge definitions';


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    organization_id text,
    track_id text NOT NULL,
    signature text NOT NULL,
    verification_url text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    revocation_reason text
);


ALTER TABLE public.certificates OWNER TO cerply_app;

--
-- Name: TABLE certificates; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.certificates IS 'Epic 7: Issued certificates with signatures';


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    intent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


ALTER TABLE public.chat_messages OWNER TO cerply_app;

--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone
);


ALTER TABLE public.chat_sessions OWNER TO cerply_app;

--
-- Name: confusion_log; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.confusion_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    question_id uuid NOT NULL,
    query text NOT NULL,
    explanation_provided text NOT NULL,
    helpful boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.confusion_log OWNER TO cerply_app;

--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    route text NOT NULL,
    user_id text NOT NULL,
    status_code integer NOT NULL,
    response_hash text NOT NULL,
    response_body jsonb NOT NULL,
    response_headers jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.idempotency_keys OWNER TO cerply_app;

--
-- Name: TABLE idempotency_keys; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.idempotency_keys IS 'Epic 7: Request deduplication (24hr TTL)';


--
-- Name: ingest_jobs; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.ingest_jobs (
    id text NOT NULL,
    user_id text,
    payload jsonb NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ingest_jobs OWNER TO cerply_app;

--
-- Name: learner_badges; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.learner_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    badge_id uuid NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.learner_badges OWNER TO cerply_app;

--
-- Name: TABLE learner_badges; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.learner_badges IS 'Epic 7: User badge awards';


--
-- Name: learner_levels; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.learner_levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    track_id text NOT NULL,
    level text DEFAULT 'novice'::text NOT NULL,
    correct_attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.learner_levels OWNER TO cerply_app;

--
-- Name: TABLE learner_levels; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.learner_levels IS 'Epic 7: User progression per track';


--
-- Name: manager_notifications; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.manager_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    manager_id text NOT NULL,
    type text NOT NULL,
    content jsonb NOT NULL,
    read boolean DEFAULT false NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.manager_notifications OWNER TO cerply_app;

--
-- Name: TABLE manager_notifications; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.manager_notifications IS 'Epic 7: In-app notifications for managers';


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sessions OWNER TO cerply_app;

--
-- Name: subjects; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.subjects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.subjects OWNER TO cerply_app;

--
-- Name: TABLE subjects; Type: COMMENT; Schema: public; Owner: cerply_app
--

COMMENT ON TABLE public.subjects IS 'Top-level knowledge domains (e.g., Computer Science, Finance)';


--
-- Name: users; Type: TABLE; Schema: public; Owner: cerply_app
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO cerply_app;

--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: cerply_app
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Data for Name: __drizzle_migrations; Type: TABLE DATA; Schema: drizzle; Owner: cerply_app
--

COPY drizzle.__drizzle_migrations (id, hash, created_at) FROM stdin;
1	2085175d2bc98b4f75d4afa0cb6ba017ab9e7b1e02477d6bef833d5c3257c947	1757705815614
\.


--
-- Data for Name: attempts; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.attempts (id, user_id, item_id, answer_index, answer_text, correct, time_ms, channel, partial_credit, feedback, validation_method, created_at) FROM stdin;
\.


--
-- Data for Name: audit_events; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.audit_events (id, event_type, user_id, organization_id, performed_by, request_id, metadata, occurred_at, created_at) FROM stdin;
\.


--
-- Data for Name: badges; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.badges (id, slug, name, description, icon_url, created_at) FROM stdin;
41ca5ade-63ba-46c3-80b5-02fb4804170a	first-correct	First Steps	Answered your first question correctly	\N	2025-10-11 10:43:40.346996+00
8d5001c5-80bb-4a1d-9df3-809fc1ece6c9	streak-3	On Fire	3-day streak	\N	2025-10-11 10:43:40.346996+00
4b075933-841e-419f-9072-d11018b27ecc	streak-7	Unstoppable	7-day streak	\N	2025-10-11 10:43:40.346996+00
932568db-4b6f-4450-9494-d91083b9bc54	perfect-5	Perfectionist	5 perfect scores in a row	\N	2025-10-11 10:43:40.346996+00
931979fe-2aa6-4177-ab63-dc0c49d9486d	early-bird	Early Bird	Completed a lesson before 9 AM	\N	2025-10-11 10:43:40.346996+00
8e276029-2a38-4fb0-96c8-7bef2b84cf97	night-owl	Night Owl	Completed a lesson after 10 PM	\N	2025-10-11 10:43:40.346996+00
42d37765-0001-474a-b471-a66e1b6453b6	track-complete	Track Master	Completed an entire track	\N	2025-10-11 10:43:40.346996+00
\.


--
-- Data for Name: certificates; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.certificates (id, user_id, organization_id, track_id, signature, verification_url, issued_at, revoked_at, revocation_reason) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.chat_messages (id, session_id, role, content, intent, metadata, created_at) FROM stdin;
53810b88-1b4d-4495-b15a-3fa25fa24a03	43223a3f-43c2-47c1-a0bf-041e2465da50	user	hi	unknown	\N	2025-10-12 18:12:46.917159+00
41209594-d38d-4f48-a37a-9fdd438248d9	43223a3f-43c2-47c1-a0bf-041e2465da50	assistant	I'm not sure I understand. Try asking 'How am I doing?' or 'What's next?'. Type 'help' to see what I can do!	unknown	\N	2025-10-12 18:12:46.946398+00
256fef3a-d32e-40ab-af9a-38db3cafc09e	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	user	hi	unknown	\N	2025-10-12 18:13:17.252356+00
90be2b8c-897f-483c-a28e-caa40a192386	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	assistant	I'm not sure I understand. Try asking 'How am I doing?' or 'What's next?'. Type 'help' to see what I can do!	unknown	\N	2025-10-12 18:13:17.282401+00
8fc9be55-f656-44e0-b8a1-3e26b4783c88	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	user	Help	help	\N	2025-10-12 18:13:42.59171+00
8c66adac-c1d6-4c3d-a7e4-014808872b1b	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	assistant	Here are some things you can ask me:\n\n**Progress & Stats:**\n- "How am I doing?"\n- "Show my progress"\n- "What's my current level?"\n- "Show my badges"\n\n**Learning:**\n- "What's next?"\n- "Give me a question"\n- "I don't understand this answer"\n- "Explain why option A is correct"\n\n**Navigation:**\n- "Show me fire safety questions"\n- "Skip this topic"\n\n**Other:**\n- "Help" - Show this message\n\nJust ask naturally - I'll understand!	help	\N	2025-10-12 18:13:42.621627+00
60199b9d-8555-43ec-b7ed-1bda73629552	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	user	can you tell me how I'm progressing?	unknown	\N	2025-10-12 18:14:12.778414+00
40fa6843-3855-4b2d-96d6-771dfb93b31d	29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	assistant	I'm not sure I understand. Try asking 'How am I doing?' or 'What's next?'. Type 'help' to see what I can do!	unknown	\N	2025-10-12 18:14:12.80581+00
\.


--
-- Data for Name: chat_sessions; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.chat_sessions (id, user_id, started_at, ended_at) FROM stdin;
43223a3f-43c2-47c1-a0bf-041e2465da50	00000000-0000-0000-0000-000000000001	2025-10-12 18:12:46.885889+00	\N
29d4f3cd-18cf-4e4f-8968-b7c7bb79caf3	00000000-0000-0000-0000-000000000001	2025-10-12 18:13:17.220151+00	\N
\.


--
-- Data for Name: confusion_log; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.confusion_log (id, user_id, question_id, query, explanation_provided, helpful, created_at) FROM stdin;
\.


--
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.idempotency_keys (id, key, route, user_id, status_code, response_hash, response_body, response_headers, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: ingest_jobs; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.ingest_jobs (id, user_id, payload, status, created_at) FROM stdin;
\.


--
-- Data for Name: learner_badges; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.learner_badges (id, user_id, badge_id, earned_at) FROM stdin;
\.


--
-- Data for Name: learner_levels; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.learner_levels (id, user_id, track_id, level, correct_attempts, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: manager_notifications; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.manager_notifications (id, manager_id, type, content, read, sent_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.sessions (id, user_id, token, created_at) FROM stdin;
dev-session-token	dev-user	dev-session-token	2025-09-12 19:37:23.73443+00
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.subjects (id, title, description, icon, active, created_at, updated_at) FROM stdin;
00000000-0000-0000-0000-000000000001	General Knowledge	Default subject for topics without specific subject assignment	📚	t	2025-10-13 11:00:02.029187+00	2025-10-13 11:00:02.029187+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: cerply_app
--

COPY public.users (id, email, created_at) FROM stdin;
dev-user	dev@local	2025-09-12 19:37:23.6706+00
00000000-0000-0000-0000-000000000001	test-epic8@cerply.local	2025-10-12 18:12:37.999949+00
\.


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE SET; Schema: drizzle; Owner: cerply_app
--

SELECT pg_catalog.setval('drizzle.__drizzle_migrations_id_seq', 1, true);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: cerply_app
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: badges badges_slug_key; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_slug_key UNIQUE (slug);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: confusion_log confusion_log_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.confusion_log
    ADD CONSTRAINT confusion_log_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: ingest_jobs ingest_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.ingest_jobs
    ADD CONSTRAINT ingest_jobs_pkey PRIMARY KEY (id);


--
-- Name: learner_badges learner_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_badges
    ADD CONSTRAINT learner_badges_pkey PRIMARY KEY (id);


--
-- Name: learner_badges learner_badges_user_id_badge_id_key; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_badges
    ADD CONSTRAINT learner_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);


--
-- Name: learner_levels learner_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_levels
    ADD CONSTRAINT learner_levels_pkey PRIMARY KEY (id);


--
-- Name: learner_levels learner_levels_user_id_track_id_key; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_levels
    ADD CONSTRAINT learner_levels_user_id_track_id_key UNIQUE (user_id, track_id);


--
-- Name: manager_notifications manager_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.manager_notifications
    ADD CONSTRAINT manager_notifications_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_unique; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_unique UNIQUE (token);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_events_occurred; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_audit_events_occurred ON public.audit_events USING btree (occurred_at DESC);


--
-- Name: idx_audit_events_org; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_audit_events_org ON public.audit_events USING btree (organization_id, occurred_at DESC);


--
-- Name: idx_audit_events_type; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_audit_events_type ON public.audit_events USING btree (event_type, occurred_at DESC);


--
-- Name: idx_audit_events_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_audit_events_user ON public.audit_events USING btree (user_id, occurred_at DESC);


--
-- Name: idx_certificates_revoked; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_certificates_revoked ON public.certificates USING btree (revoked_at);


--
-- Name: idx_certificates_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_certificates_user ON public.certificates USING btree (user_id);


--
-- Name: idx_chat_messages_created; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_chat_messages_created ON public.chat_messages USING btree (created_at DESC);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_chat_messages_session ON public.chat_messages USING btree (session_id);


--
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_chat_sessions_user ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_confusion_log_helpful; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_confusion_log_helpful ON public.confusion_log USING btree (helpful) WHERE (helpful IS NOT NULL);


--
-- Name: idx_confusion_log_question; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_confusion_log_question ON public.confusion_log USING btree (question_id);


--
-- Name: idx_confusion_log_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_confusion_log_user ON public.confusion_log USING btree (user_id);


--
-- Name: idx_idempotency_expires; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idx_idempotency_key_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_idempotency_key_user ON public.idempotency_keys USING btree (key, route, user_id);


--
-- Name: idx_learner_badges_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_learner_badges_user ON public.learner_badges USING btree (user_id);


--
-- Name: idx_learner_levels_track; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_learner_levels_track ON public.learner_levels USING btree (track_id);


--
-- Name: idx_learner_levels_user; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_learner_levels_user ON public.learner_levels USING btree (user_id);


--
-- Name: idx_manager_notifications_manager; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_manager_notifications_manager ON public.manager_notifications USING btree (manager_id);


--
-- Name: idx_manager_notifications_read; Type: INDEX; Schema: public; Owner: cerply_app
--

CREATE INDEX idx_manager_notifications_read ON public.manager_notifications USING btree (read, sent_at DESC);


--
-- Name: attempts attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_events audit_events_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: audit_events audit_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: certificates certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: confusion_log confusion_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.confusion_log
    ADD CONSTRAINT confusion_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: idempotency_keys idempotency_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ingest_jobs ingest_jobs_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.ingest_jobs
    ADD CONSTRAINT ingest_jobs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: learner_badges learner_badges_badge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_badges
    ADD CONSTRAINT learner_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE;


--
-- Name: learner_badges learner_badges_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_badges
    ADD CONSTRAINT learner_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: learner_levels learner_levels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.learner_levels
    ADD CONSTRAINT learner_levels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: manager_notifications manager_notifications_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.manager_notifications
    ADD CONSTRAINT manager_notifications_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: cerply_app
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO cerply_app;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO cerply_app;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO cerply_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO cerply_app;


--
-- PostgreSQL database dump complete
--

\unrestrict TszXGysway5bpznRYpROCjXcmNwNbfg8ZHuhqbpdGDgNC33Nq328PpSJH5Fzete

