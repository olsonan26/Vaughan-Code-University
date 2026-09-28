-- 0016: change sets can be undone
ALTER TYPE public.change_set_status ADD VALUE IF NOT EXISTS 'reverted';
ALTER TYPE public.change_set_status ADD VALUE IF NOT EXISTS 'error';
