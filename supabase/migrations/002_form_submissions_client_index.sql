-- Índice para growkey_form_submissions.client_id
--
-- La columna client_id se agregó en 001 (al ligar submissions a un cliente),
-- pero quedó sin índice. getSubmittedSlugs() filtra por client_id en CADA
-- corrida del motor de avance de fase (server/skool.mjs), lo que sin índice
-- es un full table scan que crece con cada formulario enviado.
--
-- Aditivo e idempotente: seguro de re-aplicar.
create index if not exists growkey_form_submissions_client_id_idx
  on public.growkey_form_submissions (client_id);
