import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// Country coordinates mapping (capital cities)
const countryCoordinates: { [key: string]: { lat: number; lng: number } } = {
  'United States': { lat: 38.9072, lng: -77.0369 },
  'United Kingdom': { lat: 51.5074, lng: -0.1278 },
  'Canada': { lat: 45.4215, lng: -75.6972 },
  'Australia': { lat: -35.2809, lng: 149.1300 },
  'Germany': { lat: 52.5200, lng: 13.4050 },
  'France': { lat: 48.8566, lng: 2.3522 },
  'India': { lat: 28.6139, lng: 77.2090 },
  'China': { lat: 39.9042, lng: 116.4074 },
  'Japan': { lat: 35.6762, lng: 139.6503 },
  'Brazil': { lat: -15.8267, lng: -47.9218 },
  'Mexico': { lat: 19.4326, lng: -99.1332 },
  'Spain': { lat: 40.4168, lng: -3.7038 },
  'Italy': { lat: 41.9028, lng: 12.4964 },
  'South Africa': { lat: -25.7479, lng: 28.2293 },
  'Nigeria': { lat: 9.0765, lng: 7.3986 },
  'Kenya': { lat: -1.2921, lng: 36.8219 },
  'Uganda': { lat: 0.3476, lng: 32.5825 },
  'Russia': { lat: 55.7558, lng: 37.6173 },
  'South Korea': { lat: 37.5665, lng: 126.9780 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Netherlands': { lat: 52.3676, lng: 4.9041 },
  'Sweden': { lat: 59.3293, lng: 18.0686 },
  'Norway': { lat: 59.9139, lng: 10.7522 },
  'Denmark': { lat: 55.6761, lng: 12.5683 },
  'Poland': { lat: 52.2297, lng: 21.0122 },
  'Turkey': { lat: 39.9334, lng: 32.8597 },
  'Egypt': { lat: 30.0444, lng: 31.2357 },
  'Argentina': { lat: -34.6037, lng: -58.3816 },
  'Chile': { lat: -33.4489, lng: -70.6693 },
  'Colombia': { lat: 4.7110, lng: -74.0721 },
  'Peru': { lat: -12.0464, lng: -77.0428 },
  'Thailand': { lat: 13.7563, lng: 100.5018 },
  'Malaysia': { lat: 3.1390, lng: 101.6869 },
  'Indonesia': { lat: -6.2088, lng: 106.8456 },
  'Philippines': { lat: 14.5995, lng: 120.9842 },
  'Vietnam': { lat: 21.0285, lng: 105.8542 },
  'Pakistan': { lat: 33.6844, lng: 73.0479 },
  'Bangladesh': { lat: 23.8103, lng: 90.4125 },
  'New Zealand': { lat: -41.2865, lng: 174.7762 },
  'Ireland': { lat: 53.3498, lng: -6.2603 },
  'Belgium': { lat: 50.8503, lng: 4.3517 },
  'Austria': { lat: 48.2082, lng: 16.3738 },
  'Switzerland': { lat: 46.9480, lng: 7.4474 },
  'Portugal': { lat: 38.7223, lng: -9.1393 },
  'Greece': { lat: 37.9838, lng: 23.7275 },
  'Czech Republic': { lat: 50.0755, lng: 14.4378 },
  'Romania': { lat: 44.4268, lng: 26.1025 },
  'Hungary': { lat: 47.4979, lng: 19.0402 },
  'Israel': { lat: 31.7683, lng: 35.2137 },
  'UAE': { lat: 24.4539, lng: 54.3773 },
  'Saudi Arabia': { lat: 24.7136, lng: 46.6753 },
};

async function getClientIP(req: NextRequest): Promise<string> {
  const forwarded = req.headers.get('x-forwarded-for');
  const real = req.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (real) {
    return real;
  }
  return 'unknown';
}

async function getLocationFromIP(ip: string): Promise<{ country: string; city: string; lat: number; lng: number }> {
  try {
    // Skip geolocation for local/private IPs
    if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return { country: 'Unknown', city: 'Unknown', lat: 0, lng: 0 };
    }

    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    // Guard against non-JSON responses (rate limit messages, HTML errors, etc.)
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('application/json')) {
      return { country: 'Unknown', city: 'Unknown', lat: 0, lng: 0 };
    }

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return { country: 'Unknown', city: 'Unknown', lat: 0, lng: 0 };
    }

    if (data && data.country_name && !data.error) {
      return {
        country: data.country_name,
        city: data.city || 'Unknown',
        lat: data.latitude || 0,
        lng: data.longitude || 0,
      };
    }
  } catch {
    // Silently ignore — geolocation is non-critical
  }

  return { country: 'Unknown', city: 'Unknown', lat: 0, lng: 0 };
}

export async function POST(req: NextRequest) {
  try {
    const { pageUrl } = await req.json();
    const ip = await getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    
    // Get location from IP
    const location = await getLocationFromIP(ip);
    
    // Store visit
    await sql`
      INSERT INTO page_visits (ip_address, country, city, latitude, longitude, visited_at, user_agent, page_url)
      VALUES (${ip}, ${location.country}, ${location.city}, ${location.lat}, ${location.lng}, NOW(), ${userAgent}, ${pageUrl})
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking visit:', error);
    return NextResponse.json({ error: 'Failed to track visit' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get live visitors (last 5 minutes)
    const liveVisitors = await sql`
      SELECT DISTINCT ON (ip_address) 
        ip_address, country, city, latitude, longitude, visited_at
      FROM page_visits
      WHERE visited_at >= NOW() - INTERVAL '5 minutes'
      ORDER BY ip_address, visited_at DESC
    `;
    
    // Get all unique visitors by country
    const allVisitors = await sql`
      SELECT country, city, latitude, longitude, COUNT(DISTINCT ip_address) as visitor_count
      FROM page_visits
      GROUP BY country, city, latitude, longitude
      HAVING country IS NOT NULL AND country != 'Unknown'
    `;
    
    // Get total unique visitors
    const totalStats = await sql`
      SELECT 
        COUNT(DISTINCT ip_address) as total_visitors,
        COUNT(*) as total_visits
      FROM page_visits
    `;
    
    // Add coordinates for countries without lat/lng
    const processedVisitors = allVisitors.map((v: any) => {
      if (!v.latitude || !v.longitude || v.latitude === 0) {
        const coords = countryCoordinates[v.country];
        if (coords) {
          return { ...v, latitude: coords.lat, longitude: coords.lng };
        }
      }
      return v;
    });
    
    const processedLive = liveVisitors.map((v: any) => {
      if (!v.latitude || !v.longitude || v.latitude === 0) {
        const coords = countryCoordinates[v.country];
        if (coords) {
          return { ...v, latitude: coords.lat, longitude: coords.lng };
        }
      }
      return v;
    });
    
    return NextResponse.json({
      liveVisitors: processedLive,
      allVisitors: processedVisitors,
      stats: totalStats[0] || { total_visitors: 0, total_visits: 0 },
    });
  } catch (error) {
    console.error('Error fetching visitor data:', error);
    return NextResponse.json({ error: 'Failed to fetch visitor data' }, { status: 500 });
  }
}
