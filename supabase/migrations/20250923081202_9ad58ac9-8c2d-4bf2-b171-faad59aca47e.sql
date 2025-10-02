-- Fix search_path for the new functions I just created
ALTER FUNCTION public.admin_delete_template_cascade(uuid) SET search_path = 'public';
ALTER FUNCTION public.admin_delete_client_program_cascade(uuid) SET search_path = 'public';