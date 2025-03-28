import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';

const app = new Hono();

// For AWS Lambda
export const handler = handle(app);

app.get('/', (c) => c.text('Hello World'));
