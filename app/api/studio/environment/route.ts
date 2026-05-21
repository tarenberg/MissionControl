import { NextResponse } from 'next/server';
import { nest } from '@/lib/nest';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const devices = await nest.listDevices().catch(err => {
      console.warn('Nest listDevices failed, returning empty:', err.message);
      return { devices: [] };
    });
    
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

export async function POST(request: Request) {
  try {
    const { command, params, deviceId } = await request.json();
    
    // If no deviceId provided, find the first thermostat
    let targetDeviceId = deviceId;
    if (!targetDeviceId) {
      const devices = await nest.listDevices();
      const thermostat = devices.devices?.find((d: any) => d.type === 'sdm.devices.types.THERMOSTAT');
      if (thermostat) {
        targetDeviceId = thermostat.name;
      }
    }

    if (!targetDeviceId) {
      throw new Error('No target device found for studio command.');
    }

    let nestCommand = command;
    let nestParams = params || {};

    // Map high-level commands to Nest traits
    if (command === 'TOGGLE_LIGHT') {
      // SDM doesn't usually have lights, but we'll log it for future expansion
      console.log('STUDIO: TOGGLE_LIGHT requested (not yet mapped to SDM trait)');
      return NextResponse.json({ success: false, message: 'Light control not yet mapped to SDM traits.' });
    }

    if (command === 'SET_TEMPERATURE' && nestParams.temperature) {
      nestCommand = 'sdm.devices.commands.ThermostatTemperatureSetpoint.SetHeat';
      // Convert F to C if needed? Nest usually expects C
      const tempF = nestParams.temperature;
      const tempC = (tempF - 32) * 5/9;
      nestParams = { heatSetpointCelsius: tempC };
    }

    const result = await nest.executeCommand(targetDeviceId, nestCommand, nestParams);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Studio Command error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
