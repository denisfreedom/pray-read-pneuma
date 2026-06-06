import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const messages = await sql`
      SELECT id, user_name, message, created_at, reply_to_id, reply_to_name, reply_to_message
      FROM live_chat_messages
      ORDER BY created_at DESC
      LIMIT 100
    `;
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user_name, message, reply_to_id, reply_to_name, reply_to_message } = await request.json();

    if (!user_name?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Name and message are required" },
        { status: 400 }
      );
    }

    if (user_name.length > 100) {
      return NextResponse.json(
        { error: "Name is too long (max 100 characters)" },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message is too long (max 500 characters)" },
        { status: 400 }
      );
    }

    // Insert message with optional reply info
    const [newMessage] = await sql`
      INSERT INTO live_chat_messages (
        user_name, 
        message, 
        reply_to_id, 
        reply_to_name, 
        reply_to_message
      )
      VALUES (
        ${user_name.trim()}, 
        ${message.trim()},
        ${reply_to_id || null},
        ${reply_to_name || null},
        ${reply_to_message || null}
      )
      RETURNING *
    `;

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("Error posting chat message:", error);
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
