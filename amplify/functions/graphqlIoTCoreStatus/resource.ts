import { defineFunction, secret } from '@aws-amplify/backend';

export const graphqlIoTCoreStatus = defineFunction({

  // optionally specify a name for the Function (defaults to directory name)
  name: 'graphqlIoTCoreStatus',
  // optionally specify a path to your handler (defaults to "./handler.ts")
  entry: './handler.ts'
});