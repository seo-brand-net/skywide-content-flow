-- SQL Script to add or update Angelique Botes in Supabase
-- This version includes mandatory GoTrue columns and a cleanup step.

DO $$
DECLARE
  target_email TEXT := 'angelique@seobrand.net';
  target_name TEXT := 'Angelique Botes';
  -- STATIC COMPLEX PASSWORD
  new_password TEXT := 'v(2&9[pL#xR7*Qz'; 
  hashed_password TEXT;
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- 1. CLEANUP: Delete any existing user with this email to prevent "Database error loading user"
  -- This will cascade to profiles if the foreign key is set up correctly.
  DELETE FROM auth.users WHERE email = target_email;

  -- 2. PREPARE: Generate the bcrypt hash for the password
  hashed_password := extensions.crypt(new_password, extensions.gen_salt('bf'));

  -- 3. INSERT: Create the user with all mandatory GoTrue columns
  INSERT INTO auth.users (
    id, 
    instance_id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    aud, 
    role,
    is_sso_user,
    is_anonymous,
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at, 
    confirmation_token, 
    email_change, 
    email_change_token_new, 
    recovery_token
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    target_email,
    hashed_password,
    now(),
    'authenticated', -- MANDATORY: GoTrue needs this
    'authenticated', -- MANDATORY: Application role
    false,           -- MANDATORY: Usually false
    false,           -- MANDATORY: Usually false
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
        'full_name', target_name,
        'display_name', target_name
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  RAISE NOTICE 'Cleanup complete. User created successfully.';
  RAISE NOTICE 'Email: %', target_email;
  RAISE NOTICE 'Password Set to: %', new_password;
END $$;
