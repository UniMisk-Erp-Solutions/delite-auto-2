-- Delite prototype backend: products catalogue, newsletter sign-ups and the public 3D-model bucket.
-- Apply with:  npx supabase db push        (or paste into the Supabase SQL editor)

-- ---------------------------------------------------------------- products ----
create table if not exists public.products (
  id         text primary key,
  name       text    not null,
  cat        text    not null,
  art        text,                      -- name of the built-in vector illustration
  image      text,                      -- optional real photo URL (replaces the art)
  price      integer not null check (price >= 0),   -- INR, inclusive of GST
  mrp        integer not null check (mrp >= 0),
  rating     numeric(2,1) not null default 0,
  reviews    integer not null default 0,
  badge      text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_cat_idx on public.products (cat);

alter table public.products enable row level security;

drop policy if exists "products are public" on public.products;
create policy "products are public" on public.products for select using (true);

-- explicit grants (belt and braces next to RLS): the public key can only read products
revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

-- ---------------------------------------------------- catalogue search (RPC) ----
-- One call returns what the /shop page needs: a page of items, the total, the page count and the
-- per-category counts (which ignore the chosen category so the chips always show what each would give).
-- Same shape as client/src/data/catalog.js, so the page code does not care where the data comes from.
create or replace function public.catalog_search(
  p_q    text default '',
  p_cat  text default 'all',
  p_sort text default 'popular',
  p_page integer default 1,
  p_size integer default 12
) returns jsonb
language plpgsql
stable
as $$
declare
  pat     text[];
  size_   integer := least(greatest(coalesce(p_size, 12), 1), 100);
  total   integer;
  pages   integer;
  at_page integer;
  facets  jsonb;
  items   jsonb;
begin
  -- every word of the query must appear in "name category"
  pat := array(
    select '%' || w || '%'
    from unnest(regexp_split_to_array(lower(trim(coalesce(p_q, ''))), '\s+')) as w
    where w <> ''
  );

  select coalesce(jsonb_object_agg(f.cat, f.n), '{}'::jsonb)
    into facets
    from (
      select p.cat, count(*) as n
      from public.products p
      where (p.name || ' ' || p.cat) ilike all (pat)
      group by p.cat
    ) f;
  facets := facets || jsonb_build_object(
    'all',
    (select count(*) from public.products p where (p.name || ' ' || p.cat) ilike all (pat))
  );

  select count(*)
    into total
    from public.products p
    where (p.name || ' ' || p.cat) ilike all (pat)
      and (p_cat is null or p_cat = 'all' or p.cat = p_cat);

  pages   := greatest(1, ceil(total::numeric / size_)::integer);
  at_page := least(greatest(1, coalesce(p_page, 1)), pages);

  select coalesce(jsonb_agg(to_jsonb(t) - 'rn' order by t.rn), '[]'::jsonb)
    into items
    from (
      select
        p.id, p.name, p.cat, p.art, p.image, p.price, p.mrp, p.rating, p.reviews, p.badge,
        row_number() over (
          order by
            case p_sort when 'price-asc'  then p.price end asc,
            case p_sort when 'price-desc' then p.price end desc,
            case p_sort when 'discount'   then 1 - p.price::numeric / nullif(p.mrp, 0) end desc,
            case p_sort when 'rating'     then p.rating end desc,
            p.reviews desc,
            p.sort_order asc,
            p.id asc
        ) as rn
      from public.products p
      where (p.name || ' ' || p.cat) ilike all (pat)
        and (p_cat is null or p_cat = 'all' or p.cat = p_cat)
      order by rn
      limit size_ offset (at_page - 1) * size_
    ) t;

  return jsonb_build_object(
    'items', items,
    'total', total,
    'pages', pages,
    'page',  at_page,
    'facets', facets
  );
end;
$$;

grant execute on function public.catalog_search(text, text, text, integer, integer) to anon, authenticated;

-- ------------------------------------------------------ newsletter sign-ups ----
create table if not exists public.newsletter_signups (
  id         bigint generated always as identity primary key,
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_signups_email_key
  on public.newsletter_signups (lower(email));

alter table public.newsletter_signups enable row level security;

-- Visitors may add themselves. Nobody can read the list with the public key (use the dashboard).
drop policy if exists "anyone can subscribe" on public.newsletter_signups;
create policy "anyone can subscribe" on public.newsletter_signups
  for insert to anon, authenticated with check (true);

revoke all on public.newsletter_signups from anon, authenticated;
grant insert on public.newsletter_signups to anon, authenticated;

-- ------------------------------------------------------- 3D model storage ----
-- Public bucket: the site loads delite.glb and innova-parts.glb straight from here (CDN-backed).
-- Upload them once with:  npm run models:upload
insert into storage.buckets (id, name, public, file_size_limit)
values ('models', 'models', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "models are public" on storage.objects;
create policy "models are public" on storage.objects for select using (bucket_id = 'models');
