import sql from "@/app/api/utils/sql";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get latest version timestamps for each content category
    // Note: bible_verses uses created_at, others use updated_at
    const [bibleVersions] = await sql`
      SELECT 
        MAX(created_at) as last_updated
      FROM bible_verses
    `;

    const [commentariesVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM verse_commentaries
    `;

    const [prayersVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM verse_prayers
    `;

    const [introductionsVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM book_introductions
    `;

    const [devotionalsVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM devotional_entries
    `;

    const [qaVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM bible_qa
    `;

    const [theologicalVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM verse_theological_insights
    `;

    const [historicalVersion] = await sql`
      SELECT 
        MAX(updated_at) as last_updated
      FROM verse_historical_context
    `;

    // Get total counts for each category
    const [bibleCounts] = await sql`
      SELECT 
        COUNT(DISTINCT book_id) as books,
        COUNT(*) as verses
      FROM bible_verses
    `;

    const [commentariesCount] = await sql`
      SELECT COUNT(*) as count FROM verse_commentaries
    `;

    const [prayersCount] = await sql`
      SELECT COUNT(*) as count FROM verse_prayers
    `;

    const [introductionsCount] = await sql`
      SELECT COUNT(*) as count FROM book_introductions
    `;

    const [devotionalsCount] = await sql`
      SELECT COUNT(*) as count FROM devotional_entries
    `;

    const [qaCount] = await sql`
      SELECT COUNT(*) as count FROM bible_qa
    `;

    const [theologicalCount] = await sql`
      SELECT COUNT(*) as count FROM verse_theological_insights
    `;

    const [historicalCount] = await sql`
      SELECT COUNT(*) as count FROM verse_historical_context
    `;

    // Format response with version and count for each category
    const contentVersions = {
      bibleBooks: {
        version: bibleVersions?.last_updated || new Date().toISOString(),
        count: parseInt(bibleCounts?.books || "0"),
        versesCount: parseInt(bibleCounts?.verses || "0"),
        label: "Bible Books"
      },
      bibleVerses: {
        version: bibleVersions?.last_updated || new Date().toISOString(),
        count: parseInt(bibleCounts?.verses || "0"),
        label: "Bible Verses"
      },
      commentaries: {
        version: commentariesVersion?.last_updated || new Date().toISOString(),
        count: parseInt(commentariesCount?.count || "0"),
        label: "Commentaries"
      },
      prayers: {
        version: prayersVersion?.last_updated || new Date().toISOString(),
        count: parseInt(prayersCount?.count || "0"),
        label: "Prayer Passages"
      },
      introductions: {
        version: introductionsVersion?.last_updated || new Date().toISOString(),
        count: parseInt(introductionsCount?.count || "0"),
        label: "Book Introductions"
      },
      devotionals: {
        version: devotionalsVersion?.last_updated || new Date().toISOString(),
        count: parseInt(devotionalsCount?.count || "0"),
        label: "Devotionals"
      },
      qa: {
        version: qaVersion?.last_updated || new Date().toISOString(),
        count: parseInt(qaCount?.count || "0"),
        label: "Q&A"
      },
      theological: {
        version: theologicalVersion?.last_updated || new Date().toISOString(),
        count: parseInt(theologicalCount?.count || "0"),
        label: "Theological Insights"
      },
      historical: {
        version: historicalVersion?.last_updated || new Date().toISOString(),
        count: parseInt(historicalCount?.count || "0"),
        label: "Historical Context"
      },
      verseOfTheDay: {
        version: new Date().toISOString(),
        count: 1,
        label: "Verse of the Day"
      }
    };

    return NextResponse.json({
      success: true,
      versions: contentVersions,
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching content versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch content versions" },
      { status: 500 }
    );
  }
}
