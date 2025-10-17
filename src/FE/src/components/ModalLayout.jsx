import { Box, Modal } from "@mui/material";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Typography } from "@mui/material";
import React from "react";

const ModalLayout = ({
  handleClose,
  open,
  children,
  mobile = false,
  className = "w-96",
  innerClassName,
}) => {
  const mobileStyle = mobile
    ? {
        display: { xs: "none", md: "block", lg: "block" },
      }
    : {};
  return (
    <Modal
      open={open}
      onClose={handleClose}
      disableScrollLock={mobile}
      sx={mobileStyle}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box
        className={`absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 z-[99] ${className} bg-[#2e2154] overflow-y-auto  text-white border-none shadow-xl p-10 rounded-3xl max-h-[95vh]`}
      >
        <div
          className={`w-full h-full flex justify-center items-start ${innerClassName} overflow-y-auto `}
        >
          <Typography
            className="absolute top-3 right-3 w-8 h-8 flex justify-center items-center cursor-pointer"
            onClick={handleClose}
            component="span"
            variant="body2"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </Typography>
          {children}
        </div>
      </Box>
    </Modal>
  );
};

export default ModalLayout;
