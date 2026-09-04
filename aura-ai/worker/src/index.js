import { verifyToken } from "@clerk/backend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserId(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
    return payload.sub;
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return null;
  }
}

function makeTitle(message) {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? clean.slice(0, 42) + "…" : clean || "New chat";
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({ status: "ok" });
    }

    // ---------------- Conversations ----------------
    if (url.pathname === "/api/conversations") {
      const userId = await getUserId(request, env);
      if (!userId) return json({ error: "Unauthorized" }, 401);

      if (request.method === "GET") {
        const { results } = await env.DB.prepare(
          "SELECT id, title, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC"
        ).bind(userId).all();
        return json({ conversations: results });
      }

      if (request.method === "POST") {
        const id = crypto.randomUUID();
        const now = Date.now();
        await env.DB.prepare(
          "INSERT INTO conversations (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        ).bind(id, userId, "New chat", now, now).run();
        return json({ id, title: "New chat", updated_at: now });
      }

      if (request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return json({ error: "Missing id" }, 400);
        await env.DB.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").bind(id, userId).run();
        await env.DB.prepare("DELETE FROM messages WHERE conversation_id = ?").bind(id).run();
        return json({ success: true });
      }
    }

    // ---------------- Messages ----------------
    if (url.pathname === "/api/messages" && request.method === "GET") {
      const userId = await getUserId(request, env);
      if (!userId) return json({ error: "Unauthorized" }, 401);

      const conversationId = url.searchParams.get("conversationId");
      if (!conversationId) return json({ error: "Missing conversationId" }, 400);

      const owns = await env.DB.prepare(
        "SELECT id FROM conversations WHERE id = ? AND user_id = ?"
      ).bind(conversationId, userId).first();
      if (!owns) return json({ error: "Not found" }, 404);

      const { results } = await env.DB.prepare(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
      ).bind(conversationId).all();
      return json({ messages: results });
    }

    // ---------------- Chat ----------------
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const userId = await getUserId(request, env);
      if (!userId) return json({ error: "Unauthorized — please sign in." }, 401);

      try {
        const { conversationId, message } = await request.json();
        if (!conversationId || !message) return json({ error: "Missing conversationId or message" }, 400);

        const conversation = await env.DB.prepare(
          "SELECT id, title FROM conversations WHERE id = ? AND user_id = ?"
        ).bind(conversationId, userId).first();
        if (!conversation) return json({ error: "Conversation not found" }, 404);

        const now = Date.now();
        const userMsgId = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)"
        ).bind(userMsgId, conversationId, message, now).run();

        // Pull recent history for context (last 20 messages)
        const { results: history } = await env.DB.prepare(
          "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20"
        ).bind(conversationId).all();

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              {
                role: "system",
                content:
                  "You are Aura AI, a helpful virtual assistant. When a list of items, steps, tips, or options is useful, format it as markdown bullet points (using '- ') or a numbered list. Use **bold** for key terms. Never claim to generate images — you cannot.",
              },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ],
          }),
        });

        const groqData = await groqResponse.json();
        if (!groqResponse.ok) {
          return json({ error: groqData.error?.message || "Groq API error" }, 500);
        }

        const reply = groqData.choices[0]?.message?.content || "No response received.";
        const aiMsgId = crypto.randomUUID();
        await env.DB.prepare(
          "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)"
        ).bind(aiMsgId, conversationId, reply, Date.now()).run();

        let newTitle = null;
        if (conversation.title === "New chat") {
          newTitle = makeTitle(message);
          await env.DB.prepare(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?"
          ).bind(newTitle, Date.now(), conversationId).run();
        } else {
          await env.DB.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
            .bind(Date.now(), conversationId).run();
        }

        return json({ reply, title: newTitle });
      } catch (err) {
        return json({ error: err.message || "Internal Server Error" }, 500);
      }
    }

    return json({ error: "Not Found" }, 404);
  },
};
