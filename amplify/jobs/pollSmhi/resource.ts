import { defineFunction } from '@aws-amplify/backend';

export const pollSmhi = defineFunction({
  name: 'pollSmhi',
  schedule: '10 * * * ? *',
  entry: './handler.ts',
});