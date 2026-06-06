import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// Thematic connections between Bible books
const thematicGroups = {
  creation: [1, 2, 3, 4, 5], // Genesis - Deuteronomy
  history: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], // Joshua - Esther
  wisdom: [18, 19, 20, 21, 22], // Job - Song of Solomon
  majorProphets: [23, 24, 25, 26, 27], // Isaiah - Daniel
  minorProphets: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], // Hosea - Malachi
  gospels: [40, 41, 42, 43], // Matthew - John
  earlyChurch: [44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58], // Acts - Hebrews
  epistles: [59, 60, 61, 62, 63, 64, 65], // James - Jude
  prophecy: [66] // Revelation
};

// Get thematic group for a book
function getThematicGroup(bookNumber: number): number[] {
  for (const [_, books] of Object.entries(thematicGroups)) {
    if (books.includes(bookNumber)) {
      return books;
    }
  }
  return [];
}

// Generate personalized recommendations based on reading history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Missing email parameter' },
        { status: 400 }
      );
    }

    // Get user's reading history
    const readingHistory = await sql`
      SELECT DISTINCT 
        h.book_id,
        b.book_number,
        b.name_english,
        COUNT(*) as read_count,
        MAX(h.read_at) as last_read
      FROM user_reading_history h
      LEFT JOIN bible_books b ON h.book_id = b.id
      WHERE h.user_email = ${userEmail}
      GROUP BY h.book_id, b.book_number, b.name_english
      ORDER BY last_read DESC
      LIMIT 20
    `;

    if (readingHistory.length === 0) {
      // New user - recommend popular starting points
      const recommendations = await sql`
        SELECT 
          b.id as book_id,
          b.name_english as book_name,
          b.book_number,
          1 as chapter,
          'Start your journey with the Gospel of John' as reason,
          'beginner' as difficulty
        FROM bible_books b
        WHERE b.book_number IN (43, 19, 40, 1, 20)
        ORDER BY 
          CASE b.book_number
            WHEN 43 THEN 1  -- John (best starting point)
            WHEN 19 THEN 2  -- Psalms (worship & poetry)
            WHEN 40 THEN 3  -- Matthew (life of Jesus)
            WHEN 1 THEN 4   -- Genesis (creation story)
            WHEN 20 THEN 5  -- Proverbs (wisdom)
          END
        LIMIT 5
      `;

      return NextResponse.json({ recommendations });
    }

    // Get books the user has already read
    const readBookIds = readingHistory.map((r: any) => r.book_id);
    const readBookNumbers = readingHistory.map((r: any) => r.book_number);

    // Find thematic connections
    const thematicRecommendations = new Set<number>();
    readBookNumbers.forEach((bookNum: number) => {
      const group = getThematicGroup(bookNum);
      group.forEach(num => {
        if (!readBookNumbers.includes(num)) {
          thematicRecommendations.add(num);
        }
      });
    });

    // Get book details for thematic recommendations
    let recommendations: any[] = [];
    
    if (thematicRecommendations.size > 0) {
      const thematicArray = Array.from(thematicRecommendations).slice(0, 3);
      
      let bookPlaceholders = sql``;
      if (thematicArray.length === 1) {
        bookPlaceholders = sql`WHERE b.book_number = ${thematicArray[0]}`;
      } else if (thematicArray.length === 2) {
        bookPlaceholders = sql`WHERE b.book_number IN (${thematicArray[0]}, ${thematicArray[1]})`;
      } else if (thematicArray.length === 3) {
        bookPlaceholders = sql`WHERE b.book_number IN (${thematicArray[0]}, ${thematicArray[1]}, ${thematicArray[2]})`;
      }
      
      recommendations = await sql`
        SELECT 
          b.id as book_id,
          b.name_english as book_name,
          b.book_number,
          1 as chapter,
          'Related to your recent readings' as reason,
          CASE 
            WHEN b.book_number IN (40, 41, 42, 43, 19, 20) THEN 'beginner'
            WHEN b.book_number IN (1, 2, 6, 44, 45) THEN 'intermediate'
            ELSE 'advanced'
          END as difficulty
        FROM bible_books b
        ${bookPlaceholders}
        ORDER BY b.book_number
        LIMIT 3
      `;
    }

    // Add progression-based recommendations (harder books after mastering easier ones)
    const hasReadGospels = readBookNumbers.some((n: number) => [40, 41, 42, 43].includes(n));
    const hasReadPsalms = readBookNumbers.includes(19);
    
    if (hasReadGospels && recommendations.length < 5) {
      // Recommend Acts or Romans
      const progressionRecs = await sql`
        SELECT 
          b.id as book_id,
          b.name_english as book_name,
          b.book_number,
          1 as chapter,
          'Continue your journey through the New Testament' as reason,
          'intermediate' as difficulty
        FROM bible_books b
        WHERE b.book_number IN (44, 45)
        AND b.id NOT IN (${sql`SELECT UNNEST(ARRAY[${readBookIds.join(',')}]::int[])`})
        LIMIT ${5 - recommendations.length}
      `;
      recommendations = [...recommendations, ...progressionRecs];
    }

    if (hasReadPsalms && recommendations.length < 5) {
      // Recommend Proverbs
      const wisdomRecs = await sql`
        SELECT 
          b.id as book_id,
          b.name_english as book_name,
          b.book_number,
          1 as chapter,
          'Explore more wisdom literature' as reason,
          'beginner' as difficulty
        FROM bible_books b
        WHERE b.book_number = 20
        AND b.id NOT IN (${sql`SELECT UNNEST(ARRAY[${readBookIds.join(',')}]::int[])`})
        LIMIT ${5 - recommendations.length}
      `;
      recommendations = [...recommendations, ...wisdomRecs];
    }

    // Fill remaining slots with popular books not yet read
    if (recommendations.length < 5) {
      const popularBooks = await sql`
        SELECT 
          b.id as book_id,
          b.name_english as book_name,
          b.book_number,
          1 as chapter,
          'Highly recommended for all readers' as reason,
          CASE 
            WHEN b.book_number IN (40, 41, 42, 43, 19, 20) THEN 'beginner'
            ELSE 'intermediate'
          END as difficulty
        FROM bible_books b
        WHERE b.book_number IN (43, 19, 40, 1, 20, 45, 49, 44)
        AND b.id NOT IN (${sql`SELECT UNNEST(ARRAY[${readBookIds.join(',')}]::int[])`})
        ORDER BY 
          CASE b.book_number
            WHEN 43 THEN 1
            WHEN 19 THEN 2
            WHEN 40 THEN 3
            WHEN 45 THEN 4
            WHEN 49 THEN 5
            WHEN 44 THEN 6
            WHEN 1 THEN 7
            WHEN 20 THEN 8
          END
        LIMIT ${5 - recommendations.length}
      `;
      recommendations = [...recommendations, ...popularBooks];
    }

    // Limit to 5 recommendations
    recommendations = recommendations.slice(0, 5);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
