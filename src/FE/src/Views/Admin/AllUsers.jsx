import React, { useEffect, useState } from "react";
import axiosInstance from "../../axiosInstance";

const AllUsers = () => {
  const [userData, setUserData] = useState(null);

  const data = async () => {
    try {
      const res = await axiosInstance.getData(`/user/`);
      setUserData(res.result);
    } catch (err) {}
  };

  useEffect(() => {
    data();
  }, []);

  return (
    <div>
      <table className="table-auto border-separate border-spacing-3 ">
        <thead>
          <tr className="text-left">
            <th>First Name</th>
            <th>Last Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Date Created</th>
          </tr>
        </thead>
        <tbody>
          {/* {userData &&
            userData.map((data) => (
              <tr>
                <td>{data.firstName}</td>
                <td>{data.lastName}</td>
                <td>{data.username}</td>
                <td>{data.email}</td>
                <td>{data.createdAt.split('T')[0]}</td>
              </tr>
            ))} */}
        </tbody>
      </table>
    </div>
  );
};

export default AllUsers;
