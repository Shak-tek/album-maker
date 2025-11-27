import React from "react";
import { Box, Heading, Text, Paragraph } from "grommet";

export default function ProfilePage({ user }) {
  return (
    <Box className="page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box gap="xsmall" margin={{ bottom: 'xl1' }}>
          <Heading level={1} margin="none">
            Hi {user.name},
          </Heading>
          <Paragraph size="medium">
            Here's your profile.
          </Paragraph>
        </Box>
        <Box pad="large" gap="small">
          <Text>Name: {user.name}</Text>
          <Text>Email: {user.email}</Text>
          <Text>Phone: {user.phone}</Text>
          <Text>Address: {user.address}</Text>
        </Box>
      </div>
    </Box>
  );
}
