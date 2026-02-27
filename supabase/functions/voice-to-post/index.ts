import { createClient } from "npm:@supabase/supabase-js@2.57.2";

type VoiceDraft = {
  title: string;
  content: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const whisperServiceUrl = Deno.env.get("WHISPER_SERVICE_URL");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env vars are missing." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!openAiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is missing." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!whisperServiceUrl) {
      return new Response(
        JSON.stringify({ error: "WHISPER_SERVICE_URL is missing." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: userData, error: userError } =
      await supabaseUserClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid user session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const action = formData.get("action") === "preview" ? "preview" : "publish";
    const shouldPolish = formData.get("polish") !== "false";
    const titleOverride = (formData.get("title")?.toString() || "").trim();
    const contentOverride = (formData.get("content")?.toString() || "").trim();
    const transcriptOverride = (
      formData.get("transcript")?.toString() || ""
    ).trim();

    if (!(audioFile instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing audio file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "publish") {
      const throttleWindowStart = new Date(Date.now() - 15_000).toISOString();
      const { data: recentPosts, error: throttleError } = await supabaseAdmin
        .from("posts")
        .select("id")
        .eq("author_id", user.id)
        .gte("created_at", throttleWindowStart)
        .limit(1);

      if (throttleError) {
        return new Response(JSON.stringify({ error: throttleError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (recentPosts && recentPosts.length > 0) {
        return new Response(
          JSON.stringify({
            error:
              "Please wait a few seconds before creating another voice post.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    let transcript = transcriptOverride;

    if (!transcript) {
      const whisperFormData = new FormData();
      whisperFormData.append("audio", audioFile);

      const whisperResponse = await fetch(whisperServiceUrl, {
        method: "POST",
        body: whisperFormData,
      });

      const whisperPayload = await whisperResponse.json();
      if (!whisperResponse.ok) {
        return new Response(
          JSON.stringify({
            error: whisperPayload?.error || "Transcription service failed.",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      transcript = (
        whisperPayload?.transcript ||
        whisperPayload?.text ||
        ""
      ).trim();
    }

    if (!transcript) {
      return new Response(
        JSON.stringify({
          error: "No transcript returned from transcription service.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let title = titleOverride;
    let content = contentOverride;

    if (!title || !content) {
      const prompt = shouldPolish
        ? "Return JSON with title and content. Create an editorial title and lightly polish the transcript without changing meaning."
        : "Return JSON with title and content. Create an editorial title and keep content exactly the same as transcript.";

      const openAiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "You are an editorial writing assistant. Never invent facts. Keep output concise and faithful.",
              },
              {
                role: "user",
                content: `${prompt}\n\nTranscript:\n${transcript}`,
              },
            ],
          }),
        },
      );

      const openAiPayload = await openAiResponse.json();

      if (!openAiResponse.ok) {
        return new Response(
          JSON.stringify({
            error: openAiPayload?.error?.message || "OpenAI generation failed.",
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const rawModelContent = openAiPayload?.choices?.[0]?.message?.content;
      const draft = JSON.parse(rawModelContent || "{}") as VoiceDraft;

      title = (title || draft.title || "Untitled Voice Post").trim();
      content = (content || draft.content || transcript).trim();
    }

    if (action === "preview") {
      return new Response(
        JSON.stringify({
          title,
          content,
          transcript,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const audioExtension = audioFile.name.split(".").pop() || "webm";
    const storagePath = `${user.id}/${Date.now()}.${audioExtension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("voice-audio")
      .upload(storagePath, audioFile, {
        contentType: audioFile.type || "audio/webm",
        upsert: false,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicAudio } = supabaseAdmin.storage
      .from("voice-audio")
      .getPublicUrl(storagePath);

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: user.id,
        username: `writer_${user.id.slice(0, 6)}`,
        display_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Writer",
        avatar_url: user.user_metadata?.avatar_url || null,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: insertedPost, error: insertError } = await supabaseAdmin
      .from("posts")
      .insert({
        author_id: user.id,
        title,
        content,
        raw_transcript: transcript,
        audio_url: publicAudio.publicUrl,
        visibility: "public",
      })
      .select("id,title")
      .single();

    if (insertError || !insertedPost) {
      return new Response(
        JSON.stringify({
          error: insertError?.message || "Failed to save post.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        postId: insertedPost.id,
        title: insertedPost.title,
        transcript,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
