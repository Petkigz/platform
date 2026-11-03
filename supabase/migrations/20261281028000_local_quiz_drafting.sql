-- A teacher can try a local quiz draft without publishing it or sending the
-- material to a cloud inference API. This updates the description only: the
-- existing switch remains off until the owner enables it after local setup.
update public.platform_settings
   set description = 'Draft quiz questions from teacher-supplied teaching material',
       preconditions = 'A draft tool on the course authoring screen sends teacher-supplied text to qwen3:4b through Ollama on the web server loopback address. It stores and publishes no questions; the teacher checks the draft and adds approved questions through the assessment editor. It is not a transcript system. Before switching on, install Ollama and the model on the same machine as the web server, restrict access to the local service, and test the model and teacher review process. No external AI API is used. The learner assistant remains retrieval-only.'
 where key = 'learning.ai_quiz_gen';
