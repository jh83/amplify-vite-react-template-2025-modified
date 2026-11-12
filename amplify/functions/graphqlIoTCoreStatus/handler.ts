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

  // Update device status in GraphQL API / Devices table
  const { data, errors } = await client.models.Devices.update({
    device_id: event.device_id,
    status: event.eventType,
  });

  console.log('Data:', data);
  console.log('Errors:', errors);

  // If error updating device, return error
  if (errors) {
    console.log('UpdateDevices errors:', errors);
    return { statusCode: 400, body: JSON.stringify({ errors }) };
  }

  // If device updated successfully, return device
  return { statusCode: 200, body: JSON.stringify(data) };
};