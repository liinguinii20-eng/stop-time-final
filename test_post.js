import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 4000,
  path: '/api/platos',
  method: 'GET',
  headers: {
    // We need a valid token or bypass auth.
    // I can generate a token or just bypass it temporarily
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
req.end();
