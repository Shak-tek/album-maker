const ImageKit = require('imagekit');

exports.handler = async () => {
  const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
  });

  try {
    const result = imagekit.getAuthenticationParameters();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
