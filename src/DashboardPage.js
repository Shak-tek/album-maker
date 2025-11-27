import React from "react";
import { Box, Heading, Paragraph } from "grommet";
import BoxDashboard from "./components/BoxDashboard";

export default function DashboardPage({ user, navigate }) {
  return (
    <Box className="page-wrap" pad={{ vertical: 'xl1' }}>
      <div className="page-container">
        <Box gap="xsmall" margin={{ bottom: 'xl1' }}>
          <Heading level={1} margin="none">
            Hi {user.name},
          </Heading>
          <Paragraph size="large">
            Here's your dashboard.
          </Paragraph>
        </Box>
        {/* <div className="dashboard-boxes">
          <div className="dashboard-box">
            <div className="box-holder">
              <i className="far fa-user"></i>
              <h4>Profile</h4>
              <p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.</p>
            </div>
          </div>
        </div> */}
        <BoxDashboard navigate={navigate} />
      </div>
    </Box>
  );
}
