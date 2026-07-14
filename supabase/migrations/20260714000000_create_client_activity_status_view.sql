-- ═══════════════════════════════════════════════════════════════════════════
-- client_activity_status: one row per client summarizing real activity
-- (not just configuration) across Content, GBP, and Indexing, so
-- /settings/clients can show whether each automation is actually working
-- instead of just whether it's toggled on.
--
-- Purely additive — a new view, doesn't touch any existing table or the
-- data the live app currently reads. Safe to run any time.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.client_activity_status AS
SELECT
  c.id AS client_id,

  -- Content: how many requests are still open, and when the last one came in
  (SELECT count(*) FROM public.content_requests cr
     WHERE cr.client_id = c.id
       AND cr.status NOT IN ('complete', 'completed', 'error', 'failed', 'cancelled')
  ) AS pending_content_count,
  (SELECT max(cr.created_at) FROM public.content_requests cr
     WHERE cr.client_id = c.id
  ) AS last_content_request_at,

  -- GBP: when the last post was generated, and how many are awaiting review
  (SELECT max(gp.generated_at) FROM public.gbp_posts gp
     WHERE gp.gbp_client_id = c.id
  ) AS last_gbp_post_at,
  (SELECT count(*) FROM public.gbp_posts gp
     WHERE gp.gbp_client_id = c.id AND gp.status = 'DRAFT'
  ) AS gbp_draft_count,

  -- Indexing: the real outcome of the most recent run — clients.indexing_last_run_at
  -- alone can't tell success from failure (it's nulled on rate-limit/timeout to
  -- force a retry, and stamped on both success AND non-retryable errors).
  (SELECT ir.status FROM public.indexing_runs ir
     WHERE ir.indexing_client_id = c.id
     ORDER BY ir.created_at DESC LIMIT 1
  ) AS last_indexing_status,
  (SELECT ir.created_at FROM public.indexing_runs ir
     WHERE ir.indexing_client_id = c.id
     ORDER BY ir.created_at DESC LIMIT 1
  ) AS last_indexing_run_at

FROM public.clients c;
