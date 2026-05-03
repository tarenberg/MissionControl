import { NextResponse } from 'next/server';
import { NestClient } from '@/lib/nest';

/**
 * GET /api/studio/environment
 * Fetches the current temperature and humidity from the Nest thermostat.
 */
export async function GET() {
  const clientId = process.env.NEST_CLIENT_ID;
  const clientSecret = process.env.NEST_CLIENT_SECRET;
  const projectId = process.env.NEST_PROJECT_ID;
  const refreshToken = process.env.NEST_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !projectId || !refreshToken) {
    return NextResponse.json({
      error: 'Nest credentials missing from environment variables.',
      missing: {
        clientId: !clientId,
        clientSecret: !clientSecret,
        projectId: !projectId,
        refreshToken: !refreshToken,
      }
    }, { status: 500 });
  }

  try {
    const client = new NestClient({ clientId, clientSecret, projectId, refreshToken });
    const devicesData = await client.listDevices();
    
    // Filter for thermostats
    const thermostats = devicesData.devices?.filter((d: any) => d.type === 'sdm.devices.types.THERMOSTAT') || [];
    
    if (thermostats.length === 0) {
      return NextResponse.json({ error: 'No Nest thermostats found.' }, { status: 404 });
    }

    // Map to a cleaner format
    const environment = thermostats.map((t: any) => ({
      id: t.name.split('/').pop(),
      type: 'thermostat',
      name: t.traits?.['sdm.devices.traits.Info']?.customName || t.parentRelations?.[0]?.displayName || 'Thermostat',
      temperature: t.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius,
      humidity: t.traits?.['sdm.devices.traits.Humidity']?.ambientHumidityPercent,
      mode: t.traits?.['sdm.devices.traits.ThermostatMode']?.mode,
      status: t.traits?.['sdm.devices.traits.Connectivity']?.status,
    }));

    // Filter for cameras/doorbells
    const cameras = devicesData.devices?.filter((d: any) => 
      d.type === 'sdm.devices.types.CAMERA' || d.type === 'sdm.devices.types.DOORBELL'
    ) || [];

    const sensors = cameras.map((c: any) => ({
      id: c.name.split('/').pop(),
      type: c.type.split('.').pop().toLowerCase(),
      name: c.traits?.['sdm.devices.traits.Info']?.customName || c.parentRelations?.[0]?.displayName || 'Camera',
      status: 'ONLINE', // Assume online if present in list
    }));

    return NextResponse.json({ environment, sensors });
  } catch (error) {
    console.error('Error fetching Nest environment:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Nest environment data.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
