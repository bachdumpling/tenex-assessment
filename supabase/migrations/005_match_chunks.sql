-- Vector similarity search for RAG (uses same halfvec cast as HNSW index in 002).

create or replace function public.match_chunks(
  p_folder_id text,
  p_query_embedding vector(3072),
  p_match_count integer default 12
)
returns table (
  id uuid,
  document_id uuid,
  folder_id text,
  content text,
  section text,
  page_number integer,
  chunk_index integer,
  distance double precision
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    c.folder_id,
    c.content,
    c.section,
    c.page_number,
    c.chunk_index,
    (c.embedding::halfvec(3072) <=> p_query_embedding::halfvec(3072))::double precision as distance
  from public.chunks c
  where c.folder_id = p_folder_id
  order by c.embedding::halfvec(3072) <=> p_query_embedding::halfvec(3072)
  limit greatest(1, least(coalesce(p_match_count, 12), 50));
$$;

grant execute on function public.match_chunks(text, vector(3072), integer) to service_role;
