import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import handler from '../api/upload';

async function testUploadHandler() {
  const req = {
    method: 'POST',
    body: {
      filename: 'test-chair.jpg',
      contentType: 'image/jpeg'
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      console.log('API Response Status:', this.statusCode);
      console.log('API Response Body:', data);
      return this;
    },
    end() {
      return this;
    }
  };

  console.log('Invoking api/upload handler locally...');
  await handler(req, res);
}

testUploadHandler();
