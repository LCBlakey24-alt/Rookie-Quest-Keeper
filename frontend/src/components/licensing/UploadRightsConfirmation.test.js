import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UploadRightsConfirmation, { UPLOAD_RIGHTS_STATEMENT } from './UploadRightsConfirmation';

function Harness() {
  const [checked, setChecked] = useState(false);
  return (
    <>
      <UploadRightsConfirmation checked={checked} onChange={setChecked} />
      <button type="button" disabled={!checked}>Upload</button>
    </>
  );
}

describe('UploadRightsConfirmation', () => {
  test('explains what may not be uploaded and asks for the rights statement', () => {
    render(<Harness />);
    expect(screen.getByText(/don.t upload published books, adventures or other paid content/i)).toBeInTheDocument();
    const box = screen.getByRole('checkbox', { name: UPLOAD_RIGHTS_STATEMENT });
    expect(box).not.toBeChecked();
    expect(box).toHaveAccessibleDescription(/only upload your own work/i);
  });

  test('the upload stays blocked until the user confirms', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled();
  });
});
