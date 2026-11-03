# Local quiz drafting on the AyahSpring server

A first part of the owner’s local-assistant decision, not the complete assistant.
It makes draft questions for a course author from teaching material they paste.
It does not answer students, read media or transcripts, save or publish questions,
or check whether answers are religiously correct. The author must check every
question and answer against approved material and add approved questions through
the assessment editor. Do not paste learner information.

## Setup on the Windows computer

1. Install Ollama for Windows from its official site and run it on the **same
   computer and network namespace as the AyahSpring web server**. It must listen
   only on loopback. The web process calls `http://127.0.0.1:11434/api/generate`;
   a remote Ollama host or cloud AI provider is not supported by this feature.
   If the web process runs in WSL or Docker, its loopback may not be the Windows
   host’s loopback; run both in the same network namespace. Do not expose Ollama
   publicly to work around this.
2. Once, download the model by running `ollama pull qwen3:4b`. This requires an
   internet connection and disk space. After the download, generation is local;
   the feature does not call a cloud model API. Check the model's licence and
   your right to use the teaching material. Keep the model outside Git.
3. Start the existing AyahSpring web application and database using the main
   deployment guide. Sign in as the course author. In the admin feature dashboard,
   turn on `learning.ai_quiz_gen` only after completing setup and a review test.
4. Open your course under **Teach**, paste approved teaching material into
   **Draft quiz questions**, and request a draft. Review and copy approved work
   into the assessment editor. The tool itself never saves a draft.

If the switch is off, the API refuses requests. If Ollama or the model is missing,
the screen says it is unavailable; there is no automatic fallback to an external
provider. The endpoint is checked server-side against the signed-in course author.
Model output is untrusted and may be incorrect or follow instructions embedded in
source text despite the prompt; it is always a draft and must be reviewed by a
qualified person. The existing learner assistant remains retrieval-only.

## What has not been verified

This was implemented against the Ollama HTTP interface and mock responses, not
benchmarked on the owner's Windows computer. GPU availability, response speed,
concurrency, model accuracy, uptime, and the full self-hosted deployment still
need testing. The app, database, files and model all need sufficient storage;
backups must be held separately. A local server is not automatically safe to
expose to the internet. No unattended payments or paid API are configured here.
