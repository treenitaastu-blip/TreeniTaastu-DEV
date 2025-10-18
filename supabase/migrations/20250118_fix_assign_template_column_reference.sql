-- Fix the column reference in assign_template_to_user_v2 function
CREATE OR REPLACE FUNCTION public.assign_template_to_user_v2(p_template_id uuid, p_target_email text, p_start_date date, p_assigned_by uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id     uuid;
  v_program_id  uuid;
  v_client_item_id uuid;
  v_template_item_id uuid;
begin
  -- 1) Find user by email in profiles
  select id
  into   v_user_id
  from   public.profiles
  where  lower(email) = lower(p_target_email)
  limit  1;

  if v_user_id is null then
    raise exception 'User with email % not found', p_target_email
      using errcode = 'P0002';
  end if;

  -- 2) Insert the program
  insert into public.client_programs
    (template_id, assigned_to, assigned_by, start_date, is_active)
  values
    (p_template_id, v_user_id, coalesce(p_assigned_by, auth.uid()), p_start_date, true)
  returning id into v_program_id;

  -- 3) Copy template_days -> client_days
  insert into public.client_days (client_program_id, day_order, title, note)
  select v_program_id, d.day_order, d.title, d.note
  from   public.template_days d
  where  d.template_id = p_template_id
  order  by d.day_order;

  -- 4) Copy template_items -> client_items
  --    We join client_days back by (program_id, day_order)
  insert into public.client_items
    (client_day_id, order_in_day, exercise_name, sets, reps, seconds,
     weight_kg, rest_seconds, coach_notes, video_url, is_unilateral, reps_per_side, total_reps)
  select cd.id, ti.order_in_day, ti.exercise_name, ti.sets, ti.reps, ti.seconds,
         ti.weight_kg, ti.rest_seconds, ti.coach_notes, ti.video_url, ti.is_unilateral, ti.reps_per_side, ti.total_reps
  from   public.template_days   td
  join   public.template_items  ti on ti.template_day_id = td.id
  join   public.client_days     cd
         on cd.client_program_id = v_program_id
        and cd.day_order         = td.day_order
  where  td.template_id = p_template_id;

  -- 5) Copy template_alternatives -> exercise_alternatives
  --    For each client_item, copy its corresponding template_alternatives
  for v_template_item_id, v_client_item_id in
    select ti.id, ci.id
    from public.template_days td
    join public.template_items ti on ti.template_day_id = td.id
    join public.client_days cd on cd.client_program_id = v_program_id and cd.day_order = td.day_order
    join public.client_items ci on ci.client_day_id = cd.id and ci.order_in_day = ti.order_in_day
    where td.template_id = p_template_id
  loop
    -- Copy alternatives for this specific template item
    insert into public.exercise_alternatives (
      primary_exercise_id,
      alternative_name,
      alternative_description,
      alternative_video_url,
      difficulty_level,
      equipment_required,
      muscle_groups
    )
    select
      v_client_item_id,
      ta.alternative_name,
      ta.alternative_description,
      ta.alternative_video_url,
      ta.difficulty_level,
      ta.equipment_required,
      ta.muscle_groups
    from public.template_alternatives ta
    where ta.primary_exercise_id = v_template_item_id;
  end loop;

  -- 6) Return the new program id (required by RETURNS uuid)
  return v_program_id;
end;
$function$;
