import type { EventBridgeHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/pollSmhi';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler: EventBridgeHandler<'Scheduled Event', null, void> = async () => {
    const { data: devices, errors: listErrors } = await client.models.Devices.list({
        filter: { device_type: { eq: 'weatherStation' } },
    });

    if (listErrors) {
        console.log('ListDevices errors:', listErrors);
        throw new Error('ListDevices failed');
    }

    for (const device of devices) {
        if (!device.device_id || !device.owner) continue;

        const response = await fetch(
            `https://opendata-download-metobs.smhi.se/api/version/latest/parameter/1/station/${device.device_id}/period/latest-hour/data.json`,
        );
        const body = await response.json();
        console.log(device.device_id, JSON.stringify(body));

        if (response.status !== 200 || !body.value?.[0]) {
            console.log('SMHI skip:', device.device_id, response.status);
            continue;
        }

        const reading = body.value[0];
        const { errors: createErrors } = await client.models.Telemetry.create({
            device_id: device.device_id,
            timestamp: String(new Date(reading.date).getTime()),
            temperature: parseFloat(reading.value),
            owner: device.owner,
        });

        if (createErrors) {
            console.log('CreateTelemetry errors:', device.device_id, createErrors);
        }
    }
};