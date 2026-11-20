import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot';
import { IoTDataPlaneClient, UpdateThingShadowCommand } from '@aws-sdk/client-iot-data-plane';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/updateDeviceShadow';
import type { Schema } from '../../data/resource';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>({ authMode: 'iam' });

export const handler: Schema['UpdateDeviceShadow']['functionHandler'] = async (event) => {
  const { device_id, sendInterval } = event.arguments;

  if (sendInterval < 60) {
    throw new Error('sendInterval must be at least 60 seconds');
  }

  const userId = event.identity && 'sub' in event.identity ? event.identity.sub : undefined;

  const { data: device, errors } = await client.models.Devices.get({ device_id });

  if (errors || !device?.owner || device.owner !== userId) {
    throw new Error('Not the owner');
  }

  if (device.device_type !== 'esp32') {
    throw new Error('sendInterval can only be set for an ESP32');
  }

  const endpoint = await new IoTClient({}).send(
    new DescribeEndpointCommand({ endpointType: 'iot:Data-ATS' }),
  );
  const iotData = new IoTDataPlaneClient({
    endpoint: `https://${endpoint.endpointAddress}`,
  });

  await iotData.send(new UpdateThingShadowCommand({
    thingName: device_id,
    payload: new TextEncoder().encode(JSON.stringify({
      state: { desired: { sendInterval: sendInterval * 1000 } },
    })),
  }));

  const raw = device.shadow_desired;
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const currentDesired =
    parsed && typeof parsed === 'object'
      ? parsed as Record<string, unknown>
      : {};

  const { errors: updateErrors } = await client.models.Devices.update({
    device_id,
    shadow_desired: JSON.stringify({
      ...currentDesired,
      sendInterval: sendInterval * 1000,
    }),
  });

  if (updateErrors) {
    throw new Error(updateErrors[0].message);
  }

  return 'ok';
};