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
  const { data, errors } = await client.models.Devices.update({
    device_id: event.device_id,
    status: event.eventType,
  });

  if (errors) {
    console.log('UpdateDevices errors:', errors);
    return { statusCode: 400, body: JSON.stringify({ errors }) };
  }

  return { statusCode: 200, body: JSON.stringify(data) };
};