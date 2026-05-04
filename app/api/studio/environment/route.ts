import { NextResponse } from 'next/server';
import { nest } from '@/lib/nest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const devices = await nest.listDevices();
    const environment: any[] = [];
    const sensors: any[] = [];

    for (const device of devices.devices || []) {
      const traits = device.traits || {};
      const name = device.parentRelations?.[0]?.displayName || device.traits?.['sdm.devices.traits.Info']?.customName || 'Studio';
      
      // Handle Thermostats
      if (device.type === 'sdm.devices.types.THERMOSTAT') {
        const tempTrait = traits['sdm.devices.traits.Temperature'];
        const humidityTrait = traits['sdm.devices.traits.Humidity'];
        const modeTrait = traits['sdm.devices.traits.ThermostatMode'];
        const hvacTrait = traits['sdm.devices.traits.ThermostatHvac'];

        if (tempTrait) {
          const tempCelsius = tempTrait.ambientTemperatureCelsius;
          const humidity = humidityTrait ? humidityTrait.ambientHumidityPercent : null;
          const tempF = (tempCelsius * 9/5) + 32;

          // Log to database for historical tracking
          await prisma.climateLog.create({
            data: {
              temperature: tempF,
              humidity: humidity,
              deviceId: device.name,
            }
          });

          environment.push({
            id: device.name,
            name: name,
            temperature: tempCelsius,
            temperatureF: tempF,
            humidity: humidity,
            mode: modeTrait?.mode || 'OFF',
            status: hvacTrait?.status || 'OFF',
          });
        }
      }

      // Handle Cameras/Doorbells
      if (device.type === 'sdm.devices.types.CAMERA' || device.type === 'sdm.devices.types.DOORBELL') {
        const connectivity = traits['sdm.devices.traits.Connectivity'];
        sensors.push({
          id: device.name,
          name: name || (device.type === 'sdm.devices.types.DOORBELL' ? 'Front Door' : 'Camera'),
          type: device.type.split('.').pop().toLowerCase(),
          status: connectivity?.status || 'OFFLINE',
        });
      }
    }

    return NextResponse.json({ environment, sensors });
  } catch (error: any) {
    console.error('Studio Bridge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
