-- Update the select policy to not restrict deleted_at IS NULL
DROP POLICY IF EXISTS knowledge_documents_select ON public.knowledge_documents;
CREATE POLICY knowledge_documents_select ON public.knowledge_documents
  FOR SELECT USING (auth.uid() = user_id);
