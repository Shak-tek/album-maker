import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import { Box, Text, Image } from "grommet";

const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:77fcf55d-2bdf-4f46-b979-ee71beb59193";
const BUCKET = "albumgrom";
const IK_URL_ENDPOINT = process.env.REACT_APP_IMAGEKIT_URL_ENDPOINT || "";

const getResizedUrl = (key, width = 300) =>
  `${IK_URL_ENDPOINT}/${encodeURI(key)}?tr=w-${width},fo-face`;

export default function AlbumsPage({ sessionId, onOpen }) {
  const [firstImage, setFirstImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    const creds = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
    });
    AWS.config.update({ region: REGION, credentials: creds });

    creds.get(async (err) => {
      if (err) {
        console.error("Cognito error", err);
        setLoading(false);
        return;
      }
      const s3 = new AWS.S3({ apiVersion: "2006-03-01", params: { Bucket: BUCKET } });
      try {
        const { Contents } = await s3
          .listObjectsV2({ Prefix: `${sessionId}/` })
          .promise();
        if (Contents.length) {
          setFirstImage(getResizedUrl(Contents[0].Key, 300));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
  }, [sessionId]);

  return (
    <Box pad="large" gap="medium">
      <Text weight="bold" size="large">
        My Album
      </Text>
      {loading && <Text>Loading...</Text>}
      {!loading && firstImage && (
        <Box
          height="small"
          width="small"
          onClick={() => onOpen && onOpen()}
          style={{ cursor: onOpen ? "pointer" : undefined }}
        >
          <Image src={firstImage} fit="cover" />
        </Box>
      )}
      {!loading && !firstImage && <Text>No photos uploaded yet.</Text>}
    </Box>
  );
}
