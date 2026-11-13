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

    // Get device from GraphQL API / Devices table
    const { data: device, errors: getErrors } = await client.models.Devices.get({
        device_id: event.device_id,
    });

    // If error getting device, return error
    if (getErrors || !device?.owner) {
        console.log('GetDevice errors:', getErrors);
        return { statusCode: 400, body: JSON.stringify({ errors: getErrors, device }) };
    }

    // Create telemetry in GraphQL API / Telemetry table
    const { data: telemetry, errors: createErrors } = await client.models.Telemetry.create({
        device_id: event.device_id,
        timestamp: String(event.timestamp),
        temperature: event.temperature,
        humidity: event.humidity,
        owner: device.owner,
    });

    // If error creating telemetry, return error
    if (createErrors) {
        console.log('CreateTelemetry errors:', createErrors);
        return { statusCode: 400, body: JSON.stringify({ errors: createErrors }) };
    }

    // If webhook is enabled and webhook URL is set
    if (device.webhook_telemetry_enabled === true && device.webhook_url) {
        console.log('Sending webhook to:', device.webhook_url);
        const msgBody = {
           // content: event.eventType,
            embeds: [
                {
                    title: 'Temperature: ' + event.temperature + '°C',
                    description: `at <t:${Math.floor(event.timestamp / 1000)}:F>`,
                    color: 45973,
                },
            ],
        };

        // Send webhook
        const response = await fetch(device.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(msgBody),
        });

        console.log('Webhook response:', response.status);

        // If webhook response is not 204, return error
        if (response.status !== 204) {
            console.error('Discord webhook error:', response.status, await response.text());
        }
    }

    // If telemetry created successfully, return telemetry
    return { statusCode: 200, body: JSON.stringify(telemetry) };
};