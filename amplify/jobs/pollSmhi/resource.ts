import { defineFunction } from '@aws-amplify/backend';

export const pollSmhi = defineFunction({
  name: 'pollSmhi',
  schedule: '0/5 * * * ? *',
  entry: './handler.ts',
});