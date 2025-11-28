import React from "react";
import { Box, Heading,  Paragraph } from "grommet";

export default function ProfilePage({ user }) {
  return (
    <Box className="page-wrap profile-page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box gap="xsmall" margin={{ bottom: 'xl1' }}>
          <Heading level={1} margin="none">
            Hi {user.name},
          </Heading>
          <Paragraph size="medium">
            Here's your profile.
          </Paragraph>
        </Box>
        <Box className="profile-boxes" gap="small">
          <Box className="profile-box">
            <span class="title">Name:</span> <span className="text">{user.name}</span>
          </Box>
          <Box className="profile-box">
            <span class="title">Email:</span> <span className="text">{user.email}</span>
          </Box>
          <Box className="profile-box">
            <span class="title">Phone:</span> <span className="text">{user.phone}</span>
          </Box>
          <Box className="profile-box">
            <span class="title">Address:</span> <span className="text">{user.address}</span>
          </Box>
        </Box>
      </div>
    </Box>
  );
}
