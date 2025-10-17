import { useState } from "react";
import axiosInstance from "../../axiosInstance";
import { toast } from "react-toastify";
import Loading from "../../components/Loading";
import EditIcon from "@mui/icons-material/Edit";
import { useDispatch } from "react-redux";
import { updateUser } from "../../Redux/features/user/userSlice";

export default function ProfileEditForm({ userData }) {
  const dispatch = useDispatch();

  const [isEditing, setIsEditing] = useState(false); // Controls edit mode
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSave = async () => {
    try {
      // Make an API call to update user data
      await axiosInstance.postData("/user/update-profile", {
        firstName,
        lastName,
      });
      dispatch(updateUser({ ...userData, firstName, lastName }));
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.message); // Handle error
    }
  };

  const handleEdit = () => {
    setIsEditing(true); // Switch to edit mode
    setFirstName(userData?.firstName);
    setLastName(userData?.lastName);
  };

  const handleCancel = () => {
    setIsEditing(false); // Switch to view mode
  };

  if (userData === null) {
    return <Loading fullscreen />;
  }

  return (
    <div className="flex  flex-col md:flex-row">
      <div className="space-y-3 p-8">
        {isEditing ? (
          <>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-[#231f2e] px-3 py-2 rounded-lg block w-full text-xl"
              placeholder="First Name"
              defaultValue={userData?.firstName}
            />
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-[#231f2e] px-3 py-2 rounded-lg block w-full text-xl"
              placeholder="Last Name"
              defaultValue={userData?.lastName}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-[#231f2e] rounded-lg hover:bg-[#2f2b3a] transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="flex text-left justify-between flex-col text-gray-400 ">
              <div className="flex justify-between">
                <span className=" text-md">Full Name: </span>
                <button
                  onClick={handleEdit}
                  className="text-sm text-white flex justify-center px-1 w-14 py-1 bg-[#231f2e] rounded-lg hover:bg-[#2f2b3a] transition-colors"
                >
                  <EditIcon style={{ fontSize: "16px" }} />
                  <span> Edit</span>
                </button>{" "}
              </div>
              <span className="text-3xl font-bold text-yellow-600">
                {userData?.firstName} {userData?.lastName}{" "}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="pt-8 pl-8  text-center md:text-left">
        {userData && (
          <div className="space-y-2 text-gray-400 text-xl">
            <p>Username: {userData?.username}</p>
            <p>Email: {userData?.email}</p>
            <p>Member since: {userData?.createdAt.split("T")[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
