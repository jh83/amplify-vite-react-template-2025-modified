import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/graphqlIoTCoreTelemetry';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler: Handler = async (event) => {
    const { data: device, errors: getErrors } = await client.models.Devices.get({
        device_id: event.device_id,
    });

    if (getErrors || !device?.owner) {
        console.log('GetDevice errors:', getErrors);
        return { statusCode: 400, body: JSON.stringify({ errors: getErrors, device }) };
    }

    const { data: telemetry, errors: createErrors } = await client.models.Telemetry.create({
        device_id: event.device_id,
        timestamp: String(event.timestamp),
        temperature: event.temperature,
        humidity: event.humidity,
        owner: device.owner,
    });

    if (createErrors) {
        console.log('CreateTelemetry errors:', createErrors);
        return { statusCode: 400, body: JSON.stringify({ errors: createErrors }) };
    }

    return { statusCode: 200, body: JSON.stringify(telemetry) };
};