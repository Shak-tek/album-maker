const express = require('express');
const ImageKit = require('imagekit');
const cors = require('cors');
require('dotenv').config();

const app = express();
const corsOptions = { origin: process.env.CORS_ORIGIN || 'http://localhost:3000' };
app.use(cors(corsOptions));

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
});

app.get('/imagekit/auth', (req, res) => {
  try {
    const result = imagekit.getAuthenticationParameters();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`ImageKit auth server listening on port ${port}`);
});
