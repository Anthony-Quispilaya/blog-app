import { supabase, supabaseAnon } from "@/lib/supabaseClient";
import type { BlogPost } from "@/types/post";

type ProfileRow = {
  username: string | null;
  display_name: string | null;
};

type PostRow = {
  id: string;
  title: string;
  content: string;
  raw_transcript: string | null;
  created_at: string;
  audio_url: string | null;
  author_id: string;
  visibility: "public" | "private";
  profiles: ProfileRow | ProfileRow[] | null;
};

type RecordedAudio =
  | Blob
  | {
      uri: string;
      type: string;
      name: string;
    };

type BlobWithMeta = {
  blob: Blob;
  filename: string;
  mimeType: string;
};

type VoicePipelineResult = {
  postId: string;
  transcript: string;
  transcriptPath: string;
  title: string;
  content: string;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function stageError(stage: string, message: string, error?: unknown) {
  const details = error ? ` | details: ${errorMessage(error)}` : "";
  return new Error(`[${stage}] ${message}${details}`);
}

function getOpenAiApiKey() {
  return (
    process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  ).trim();
}

function getProfile(row: PostRow) {
  if (!row.profiles) {
    return null;
  }

  if (Array.isArray(row.profiles)) {
    return row.profiles[0] ?? null;
  }

  return row.profiles;
}

function mapPost(row: PostRow): BlogPost {
  const profile = getProfile(row);

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    rawTranscript: row.raw_transcript,
    createdAt: row.created_at,
    audioUrl: row.audio_url,
    authorId: row.author_id,
    authorName: profile?.display_name || "Unknown",
    authorUsername: profile?.username || "unknown",
    visibility: row.visibility,
  };
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);

  return normalized || "transcript";
}

function buildTranscriptMarkdown({
  title,
  transcript,
  authorId,
}: {
  title: string;
  transcript: string;
  authorId: string;
}) {
  const createdAt = new Date().toISOString();

  return [
    "---",
    `title: \"${title.replace(/\"/g, "'")}\"`,
    `author_id: \"${authorId}\"`,
    `created_at: \"${createdAt}\"`,
    "---",
    "",
    "# Raw Transcript",
    "",
    transcript,
    "",
  ].join("\n");
}

function extensionFromFilename(filename: string) {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }
  return trimmed.slice(lastDot + 1).toLowerCase();
}

function extensionFromMimeType(mimeType: string) {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("webm")) return "webm";
  if (normalized.includes("wav")) return "wav";
  if (normalized.includes("mpeg")) return "mp3";
  if (normalized.includes("mp4") || normalized.includes("m4a")) return "m4a";
  if (normalized.includes("ogg")) return "ogg";
  return "";
}

function normalizeFilename(filename: string, mimeType: string) {
  const ext = extensionFromFilename(filename);
  if (ext) {
    return filename;
  }
  const inferred = extensionFromMimeType(mimeType);
  return inferred ? `${filename}.${inferred}` : filename;
}

async function toBlobWithMeta(audio: RecordedAudio): Promise<BlobWithMeta> {
  if (audio instanceof Blob) {
    const mimeType = (audio.type || "audio/webm").trim();
    const ext = extensionFromMimeType(mimeType) || "webm";
    const filename = `voice-note.${ext}`;
    return { blob: audio, filename, mimeType };
  }

  const response = await fetch(audio.uri);
  const fetchedBlob = await response.blob();
  const mimeType = (audio.type || fetchedBlob.type || "audio/mp4").trim();

  // Some fetch() implementations return blobs with an empty type; ensure we
  // send a consistent content type when we know it.
  const blob = fetchedBlob.type
    ? fetchedBlob
    : new Blob([fetchedBlob], { type: mimeType });

  return {
    blob,
    filename: normalizeFilename(audio.name || "voice-note", mimeType),
    mimeType,
  };
}

async function transcribeAudio(audio: RecordedAudio) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw stageError(
      "VOICE_CONFIG",
      "Missing OpenAI key. Set EXPO_PUBLIC_OPENAI_API_KEY in your .env.",
    );
  }

  const formData = new FormData();
  formData.append("model", "whisper-1");

  if (audio instanceof Blob) {
    const { blob, filename } = await toBlobWithMeta(audio);
    // The OpenAI endpoint uses the filename/extension to determine format.
    formData.append("file", blob as never, filename);
  } else {
    // React Native multipart uploads are most reliable when using a { uri, name, type }
    // file descriptor (instead of fetching the uri to a Blob).
    formData.append("file", {
      uri: audio.uri,
      name: audio.name,
      type: audio.type,
    } as any);
  }

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw stageError(
      "VOICE_TRANSCRIBE",
      payload?.error?.message ||
        `Transcription failed with HTTP ${response.status}.`,
    );
  }

  const transcript = (payload?.text || "").trim();
  if (!transcript) {
    throw stageError(
      "VOICE_TRANSCRIBE",
      "The recording was transcribed as empty text.",
    );
  }

  return transcript;
}

async function saveTranscriptMarkdown({
  authorId,
  transcript,
}: {
  authorId: string;
  transcript: string;
}) {
  const headline = transcript.split(/[.!?\n]/)[0]?.trim() || "Voice Transcript";
  const filename = `${Date.now()}-${slugify(headline)}.md`;
  const path = `${authorId}/${filename}`;

  const markdown = buildTranscriptMarkdown({
    title: headline,
    transcript,
    authorId,
  });

  const body = new Blob([markdown], {
    type: "text/markdown;charset=utf-8",
  });

  const { error } = await supabase.storage
    .from("transcripts")
    .upload(path, body, {
      upsert: false,
      contentType: "text/markdown",
    });

  if (error) {
    if (/bucket not found/i.test(error.message || "")) {
      throw stageError(
        "VOICE_STORAGE",
        "Bucket 'transcripts' not found. Run the migration or execute SQL to create storage.buckets id/name 'transcripts' before recording.",
      );
    }

    throw stageError(
      "VOICE_STORAGE",
      error.message || "Unable to save transcript file.",
    );
  }

  return path;
}

async function generateBlogFromTranscript(transcript: string) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw stageError(
      "VOICE_CONFIG",
      "Missing OpenAI key. Set EXPO_PUBLIC_OPENAI_API_KEY in your .env.",
    );
  }

  const prompt = [
    "You are an editorial writer.",
    "Turn the transcript into a polished blog post.",
    "Return JSON with keys: title, content.",
    "Title must be concise and compelling.",
    "Content must be clear, improved, and faithful to the transcript.",
    "Transcript:",
    transcript,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write elegant, truthful blog drafts and always output valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw stageError(
      "VOICE_AI",
      payload?.error?.message ||
        `AI generation failed with HTTP ${response.status}.`,
    );
  }

  const raw = payload?.choices?.[0]?.message?.content;
  let parsed: { title?: string; content?: string } = {};

  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }

  const fallbackTitle =
    transcript
      .split(/[.!?\n]/)[0]
      ?.trim()
      ?.split(/\s+/)
      .slice(0, 8)
      .join(" ") || "New Voice Post";

  const title = (parsed.title || fallbackTitle).trim();
  const content = (parsed.content || transcript).trim();

  if (!title || !content) {
    throw stageError("VOICE_AI", "AI returned an invalid blog draft.");
  }

  return { title, content };
}

export async function fetchFeedPosts(userId?: string) {
  // Private app dashboard feed: authenticated users only see/manage their own posts.
  if (!userId) {
    return [] as BlogPost[];
  }

  const query = supabase
    .from("posts")
    .select(
      "id,title,content,raw_transcript,created_at,audio_url,author_id,visibility,profiles!posts_author_profile_fkey(username,display_name)",
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as PostRow[]).map(mapPost);
}

export async function fetchPostById(postId: string, userId?: string) {
  if (!userId) {
    return null;
  }

  let query = supabase
    .from("posts")
    .select(
      "id,title,content,raw_transcript,created_at,audio_url,author_id,visibility,profiles!posts_author_profile_fkey(username,display_name)",
    )
    .eq("id", postId)
    .eq("author_id", userId)
    .limit(1);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPost(data as unknown as PostRow);
}

export async function fetchPublicPostById({
  postId,
  username,
}: {
  postId: string;
  username: string;
}) {
  const { data, error } = await supabaseAnon
    .from("posts")
    .select(
      "id,title,content,raw_transcript,created_at,audio_url,author_id,visibility,profiles!posts_author_profile_fkey!inner(username,display_name)",
    )
    .eq("id", postId)
    .eq("visibility", "public")
    .eq("profiles.username", username)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPost(data as unknown as PostRow);
}

export async function fetchPublicPostsByUsername(username: string) {
  const { data, error } = await supabaseAnon
    .from("posts")
    .select(
      "id,title,content,raw_transcript,created_at,audio_url,author_id,visibility,profiles!posts_author_profile_fkey!inner(username,display_name)",
    )
    .eq("visibility", "public")
    .eq("profiles.username", username)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as PostRow[]).map(mapPost);
}

type CreatePostInput = {
  authorId: string;
  title: string;
  content: string;
  rawTranscript?: string;
  visibility?: "public" | "private";
};

export async function createPostDirectly({
  authorId,
  title,
  content,
  rawTranscript,
  visibility = "public",
}: CreatePostInput) {
  const normalizedTitle = title.trim();
  const normalizedContent = content.trim();

  if (!normalizedTitle) {
    throw stageError("VOICE_DB", "Title is required.");
  }

  if (!normalizedContent) {
    throw stageError("VOICE_DB", "Content is required.");
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      title: normalizedTitle,
      content: normalizedContent,
      raw_transcript: rawTranscript?.trim() || null,
      visibility,
      audio_url: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw stageError("VOICE_DB", error?.message || "Unable to save post.");
  }

  return { postId: data.id as string };
}

export async function createVoicePostFromRecording({
  audio,
  authorId,
  visibility = "public",
}: {
  audio: RecordedAudio;
  authorId: string;
  visibility?: "public" | "private";
}): Promise<VoicePipelineResult> {
  let transcript = "";
  let transcriptPath = "";

  try {
    transcript = await transcribeAudio(audio);
  } catch (error) {
    throw stageError(
      "VOICE_TRANSCRIBE",
      "Failed while converting audio to transcript.",
      error,
    );
  }

  try {
    transcriptPath = await saveTranscriptMarkdown({
      authorId,
      transcript,
    });
  } catch (error) {
    throw stageError(
      "VOICE_STORAGE",
      "Failed while saving transcript markdown file.",
      error,
    );
  }

  let draft: { title: string; content: string };
  try {
    draft = await generateBlogFromTranscript(transcript);
  } catch (error) {
    throw stageError(
      "VOICE_AI",
      "Failed while generating title/content from transcript.",
      error,
    );
  }

  let created: { postId: string };
  try {
    created = await createPostDirectly({
      authorId,
      title: draft.title,
      content: draft.content,
      rawTranscript: transcript,
      visibility,
    });
  } catch (error) {
    throw stageError(
      "VOICE_DB",
      "Failed while saving generated blog post.",
      error,
    );
  }

  return {
    postId: created.postId,
    transcript,
    transcriptPath,
    title: draft.title,
    content: draft.content,
  };
}

// Legacy Edge Function methods kept for compatibility if needed.
type VoiceToPostInput = {
  audio: RecordedAudio;
  accessToken: string;
  polish?: boolean;
};

export type VoiceDraftResponse = {
  title: string;
  content: string;
  transcript: string;
};

type VoiceToPostResponse = VoiceDraftResponse & {
  postId: string;
};

type VoicePublishInput = VoiceToPostInput & {
  titleOverride?: string;
  contentOverride?: string;
  transcriptOverride?: string;
};

async function callVoiceFunction({
  audio,
  accessToken,
  polish,
  action,
  titleOverride,
  contentOverride,
  transcriptOverride,
}: VoicePublishInput & { action: "preview" | "publish" }) {
  const formData = new FormData();
  formData.append("audio", audio as never);
  formData.append("polish", polish ? "true" : "false");
  formData.append("action", action);

  if (titleOverride) {
    formData.append("title", titleOverride);
  }

  if (contentOverride) {
    formData.append("content", contentOverride);
  }

  if (transcriptOverride) {
    formData.append("transcript", transcriptOverride);
  }

  const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-to-post`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
      },
      body: formData,
      signal: controller.signal,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "Voice pipeline failed.");
    }

    return payload;
  } catch (error) {
    const rawMessage = (error as Error).message || "Unknown error";

    const message =
      (error as Error).name === "AbortError"
        ? "Voice processing timed out. Check Edge Function deployment and WHISPER_SERVICE_URL reachability."
        : /failed to fetch|network request failed/i.test(rawMessage)
          ? `Cannot reach voice-to-post endpoint (${functionUrl}). Check EXPO_PUBLIC_SUPABASE_URL, deploy the voice-to-post Edge Function, and verify network/CORS.`
          : rawMessage;

    throw new Error(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createVoiceDraft({
  audio,
  accessToken,
  polish = true,
}: VoiceToPostInput): Promise<VoiceDraftResponse> {
  const payload = await callVoiceFunction({
    audio,
    accessToken,
    polish,
    action: "preview",
  });

  return payload as VoiceDraftResponse;
}

export async function createVoicePost({
  audio,
  accessToken,
  polish = true,
  titleOverride,
  contentOverride,
  transcriptOverride,
}: VoicePublishInput): Promise<VoiceToPostResponse> {
  const payload = await callVoiceFunction({
    audio,
    accessToken,
    polish,
    action: "publish",
    titleOverride,
    contentOverride,
    transcriptOverride,
  });

  return payload as VoiceToPostResponse;
}
