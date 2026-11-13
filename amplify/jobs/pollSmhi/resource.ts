import { defineFunction } from '@aws-amplify/backend';

export const pollSmhi = defineFunction({
  name: 'pollSmhi',
  schedule: '0/20 * * * ? *',
  entry: './handler.ts',
});