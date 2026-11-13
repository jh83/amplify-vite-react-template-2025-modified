import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/graphqlIoTCoreStatus';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler: Handler = async (event) => {

  console.log('Event:', event);

  // Get device first so the update can include the stored owner.
  // Owner auth turns a missing/mismatched owner into ConditionalCheckFailedException.
  const { data: device, errors: getErrors } = await client.models.Devices.get({
    device_id: event.clientId,
  });

  if (getErrors || !device?.owner) {
    console.log('GetDevice errors:', getErrors);
    return { statusCode: 400, body: JSON.stringify({ errors: getErrors, device }) };
  }

  const { data, errors } = await client.models.Devices.update({
    device_id: event.clientId,
    status: event.eventType,
    owner: device.owner,
  });

  console.log('Data:', data);
  console.log('Errors:', errors);

  if (errors) {
    console.log('UpdateDevices errors:', errors);
    return { statusCode: 400, body: JSON.stringify({ errors }) };
  }

  // If webhook is enabled and webhook URL is set
  if (device.webhook_status_enabled === true && device.webhook_url) {
    console.log('Sending webhook to:', device.webhook_url);

    if (!data?.createdAt) {
      console.log('UpdateDevices errors:', errors);
      return { statusCode: 400, body: JSON.stringify({ errors, data }) };
    }

    const createdAtSeconds = Math.floor(new Date(data.createdAt).getTime() / 1000);

    const msgBody = {
      content: event.eventType,
      embeds: [
        {
          title: 'Device ' + event.eventType,
          //description: `at <t:${Math.floor(event.timestamp / 1000)}:F>`,
          description: `at <t:${createdAtSeconds}:F>`,
          color: event.eventType == "connected" ? 45973 : 15158332,
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
  // If device updated successfully, return device
  return { statusCode: 200, body: JSON.stringify(data) };
};