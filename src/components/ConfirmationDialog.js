import React from 'react';

import GenericDialog from './GenericDialog';

const ConfirmationDialog = ({ loading, onConfirm, onReject, isTransaction, title, ...props }) => (
  <GenericDialog
    loading={loading}
    onConfirm={onConfirm}
    onReject={onReject}
    isTransaction={isTransaction}
    title={title || 'Are you sure?'}
    confirmText="Confirm"
    rejectText="Back">
    {props.body}
  </GenericDialog>
);

export default ConfirmationDialog;