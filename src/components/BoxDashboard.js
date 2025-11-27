import React from "react";

const BoxDashboard = ({ navigate }) => {
  return (
    <div className="dashboard-boxes">
      <div className="dashboard-box">
        <div
          className="box-holder" onClick={() => navigate("profile")}>
          <i className="far fa-user"></i>
          <h4>My Profile</h4>
          <p>
            Lorem Ipsum has been the industry's standard dummy text ever since
            the 1500s.
          </p>
        </div>
      </div>
      <div className="dashboard-box">
        <div
          className="box-holder" onClick={() => navigate("albums")}>
          <i className="fa-solid fa-compact-disc"></i>
          <h4>My Albums</h4>
          <p>
            Lorem Ipsum has been the industry's standard dummy text ever since
            the 1500s.
          </p>
        </div>
      </div>
    </div>
  ); 
};

export default BoxDashboard;

