import React from "react";
import { Box, Heading, Text } from "grommet";

export default function ProfilePage({ user }) {
  return (
    <Box className="profile-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box gap="xsmall">
          <Heading level={1} margin="none">
            Hi {user.name},
          </Heading>
          <Text size="small" margin={{ bottom: 'large' }}>
            Here's your profile.
          </Text>
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
