import React from "react";
import { Box, Text } from "grommet";

export default function ProfilePage({ user }) {
  return (
    <Box pad="large" gap="small">
      <Text>Name: {user.name}</Text>
      <Text>Email: {user.email}</Text>
      <Text>Phone: {user.phone}</Text>
      <Text>Address: {user.address}</Text>
    </Box>
  );
}
