import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
export const tokenize = input => String(input || '').toLowerCase().split(/\s+/);
