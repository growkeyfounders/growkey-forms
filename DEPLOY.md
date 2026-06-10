# Growkey Forms Deployment

This app has two public forms and separate admin panels:

- `/onboarding` -> initial 23-question onboarding form
- `/offer` -> offer exercise form
- `/admin/onboarding` -> onboarding responses only
- `/admin/offer` -> offer responses only
- `/admin` -> all responses

## 1. Create Supabase table

1. Open Supabase.
2. Create a project.
3. Go to SQL Editor.
4. Run the contents of `supabase.sql`.
5. Copy:
   - Project URL -> `SUPABASE_URL`
   - Service role key -> `SUPABASE_SERVICE_ROLE_KEY`

Use the service role key only on the server/Render environment variables. Do not expose it in frontend code.

## 2. Deploy to Render

Recommended Render settings:

- Root directory: leave it empty if you deploy the standalone `growkey-forms` repo. Use `examples/onboarding` only if you deploy from the main Growkey monorepo.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TABLE=growkey_form_submissions`
- `ALLOW_ADMIN_DELETE=false`

## 3. Final URLs

Render will create a stable URL like:

- `https://growkey-forms.onrender.com/onboarding`
- `https://growkey-forms.onrender.com/offer`
- `https://growkey-forms.onrender.com/admin/onboarding`
- `https://growkey-forms.onrender.com/admin/offer`

After that, connect a custom domain such as:

- `https://forms.growkey.ai/onboarding`
- `https://forms.growkey.ai/offer`
