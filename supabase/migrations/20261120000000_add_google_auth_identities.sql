-- Keep provider identities attached to the existing canonical profile ID.
-- This is additive: it does not change profiles.id or business-data references.
CREATE TABLE public.auth_identities (
  provider TEXT NOT NULL CHECK (provider = 'google'),
  provider_subject TEXT NOT NULL CHECK (btrim(provider_subject) <> ''),
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  email_at_link TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (provider, profile_id)
);

CREATE INDEX auth_identities_profile_id_idx
  ON public.auth_identities (profile_id);

ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_identities FROM PUBLIC, anon, authenticated;

-- A prior verifier used the email as a fallback when Google omitted `sub`.
-- Those entries are not durable provider identifiers; leave them for the
-- verified-account linking path instead of treating an email as a Google ID.
INSERT INTO public.auth_identities (provider, provider_subject, profile_id, email_at_link)
SELECT
  'google',
  details.google_id,
  profile.id,
  lower(btrim(profile.email))
FROM public.auth_registration_details AS details
JOIN public.profiles AS profile ON profile.id = details.user_id
WHERE details.google_id IS NOT NULL
  AND btrim(details.google_id) <> ''
  AND details.google_id NOT LIKE 'dev-google-%'
  AND profile.email IS NOT NULL
  AND lower(btrim(details.google_id)) <> lower(btrim(COALESCE(profile.email, '')));
