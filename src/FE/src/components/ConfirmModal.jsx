import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Typography } from '@mui/material';
import Button from './formComponents/Button';
import React from 'react';
import ModalLayout from './ModalLayout';

const ConfirmModal = ({
  title,
  buttonText,
  handleClose,
  classNameButton,
  open,
  onSubmit,
  loading,
}) => {
  return (
    <ModalLayout open={open} handleClose={handleClose}>
      <div>
        <Typography
          className="absolute top-3 right-3 w-8 h-8 flex justify-center items-center cursor-pointer"
          onClick={handleClose}
          component="span"
          variant="body2"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xl" />
        </Typography>
        <h1 className="text-xl  pb-6">{title}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex justify-between gap-3"
        >
          <Button
            type="submit"
            text={buttonText}
            className={`rounded-md mt-3 ${classNameButton} w-1/2`}
            disabled={loading}
            typeDelete={'delete'}
          />
          <Button
            type="button"
            text="Cancel"
            className="rounded-md mt-3 w-1/2"
            disabled={loading}
            onClick={handleClose}
            typeDelete={'cancel'}
          />
        </form>
      </div>
    </ModalLayout>
  );
};

export default ConfirmModal;
