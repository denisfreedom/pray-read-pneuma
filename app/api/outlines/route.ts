import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("book_id");
    const chapter = searchParams.get("chapter");
    const language = searchParams.get("language") || "english";

    if (!bookId) {
      return NextResponse.json(
        { success: false, message: "book_id is required" },
        { status: 400 }
      );
    }

    let outlines;
    if (chapter) {
      // Get chapter-specific outlines
      outlines = await sql`
        SELECT * FROM bible_outlines 
        WHERE book_id = ${bookId} 
        AND chapter = ${chapter}
        AND (language = ${language} OR language IS NULL)
        ORDER BY order_index ASC, id ASC
      `;
    } else {
      // Get all outlines for the book
      outlines = await sql`
        SELECT * FROM bible_outlines 
        WHERE book_id = ${bookId}
        AND (language = ${language} OR language IS NULL)
        ORDER BY chapter ASC, order_index ASC, id ASC
      `;
    }

    return NextResponse.json(outlines);
  } catch (error) {
    console.error("Error fetching outlines:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch outlines" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { book_id, chapter, title, content, language, order_index } = body;

    if (!book_id || !title || !content) {
      return NextResponse.json(
        { success: false, message: "book_id, title, and content are required" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO bible_outlines (book_id, chapter, title, content, language, order_index, created_at)
      VALUES (
        ${book_id},
        ${chapter || null},
        ${title},
        ${content},
        ${language || 'english'},
        ${order_index || 0},
        NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      outline: result[0],
    });
  } catch (error) {
    console.error("Error creating outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create outline" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, content, order_index } = body;

    if (!id || !title || !content) {
      return NextResponse.json(
        { success: false, message: "id, title, and content are required" },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE bible_outlines 
      SET 
        title = ${title},
        content = ${content},
        order_index = ${order_index || 0}
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: "Outline not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      outline: result[0],
    });
  } catch (error) {
    console.error("Error updating outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update outline" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "id is required" },
        { status: 400 }
      );
    }

    await sql`DELETE FROM bible_outlines WHERE id = ${id}`;

    return NextResponse.json({
      success: true,
      message: "Outline deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting outline:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete outline" },
      { status: 500 }
    );
  }
}
