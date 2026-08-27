import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/journal/weather
 * Fetches current weather and location info
 * Optional query: location (e.g., "New Haven, CT")
 */
export async function GET(request: NextRequest) {
  try {
    const location = request.nextUrl.searchParams.get('location') || 'New Haven, CT';

    // Fetch weather from wttr.in
    const weatherResponse = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1`,
      { cache: 'no-store' }
    );

    if (!weatherResponse.ok) {
      throw new Error(`Weather API returned ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();

    // Extract current weather
    const current = weatherData.current_condition?.[0];
    const temp = current?.temp_C || current?.temp_F;
    const description = current?.weatherDesc?.[0]?.value || 'Unknown';
    const icon = current?.weatherCode ? getWeatherEmoji(current.weatherCode) : '🌤️';

    const weatherString = `${icon} ${Math.round(temp || 0)}°F, ${description}`;

    return NextResponse.json({
      success: true,
      location,
      weather: weatherString,
      temperature: temp,
      description,
      icon,
    });
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch weather',
      },
      { status: 500 }
    );
  }
}

/**
 * Convert WMO weather codes to emoji
 */
function getWeatherEmoji(code: number): string {
  const weatherMap: Record<number, string> = {
    1000: '☀️',   // Clear
    1003: '⛅',   // Partly cloudy
    1006: '☁️',   // Cloudy
    1009: '☁️',   // Overcast
    1030: '🌫️',   // Mist
    1063: '🌧️',   // Light rain
    1066: '🌨️',   // Light snow
    1069: '🌧️',   // Sleet
    1072: '🌧️',   // Light freezing rain
    1075: '🌨️',   // Heavy snow
    1087: '⛈️',   // Thunderstorm
    1114: '🌨️',   // Blizzard
    1117: '🌨️',   // Heavy blizzard
    1135: '🌫️',   // Fog
    1147: '🌫️',   // Freezing fog
    1150: '🌧️',   // Light drizzle
    1153: '🌧️',   // Light drizzle
    1168: '🌧️',   // Heavy drizzle
    1171: '🌧️',   // Heavy drizzle
    1180: '🌧️',   // Light rain
    1183: '🌧️',   // Light rain
    1186: '🌧️',   // Moderate rain
    1189: '🌧️',   // Moderate rain
    1192: '🌧️',   // Heavy rain
    1195: '🌧️',   // Heavy rain
    1198: '🌧️',   // Light freezing rain
    1201: '🌧️',   // Moderate freezing rain
    1204: '🌨️',   // Light sleet
    1207: '🌨️',   // Moderate sleet
    1210: '🌨️',   // Light snow
    1213: '🌨️',   // Light snow
    1216: '🌨️',   // Moderate snow
    1219: '🌨️',   // Moderate snow
    1222: '🌨️',   // Heavy snow
    1225: '🌨️',   // Heavy snow
    1237: '🌨️',   // Ice pellets
    1240: '🌧️',   // Light rain shower
    1243: '🌧️',   // Moderate rain shower
    1246: '🌧️',   // Heavy rain shower
    1249: '🌨️',   // Light sleet shower
    1252: '🌨️',   // Moderate sleet shower
    1255: '🌨️',   // Light snow shower
    1258: '🌨️',   // Moderate snow shower
    1261: '🌨️',   // Light hail shower
    1264: '🌨️',   // Heavy hail shower
  };

  return weatherMap[code] || '🌤️';
}
