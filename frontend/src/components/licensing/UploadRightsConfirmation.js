import React, { useId } from 'react';
import './UploadRightsConfirmation.css';

/**
 * The rights check shown before any upload of text or rules content
 * (campaign workbooks, world documents, homebrew documents, rule and
 * creature imports). It explains in plain English what may not be uploaded
 * and asks the user to confirm they have the rights to what they submit.
 *
 * A ticked box is the user's own statement, not proof that the content is
 * licensed: it never makes content public, and reports and takedowns still
 * apply (docs/licensing/CONTENT_INVENTORY.md).
 *
 * Controlled: pass `checked` and `onChange(nextChecked)`.
 */
export const UPLOAD_RIGHTS_STATEMENT = 'I made this content myself or have permission to use it, and it is not copied from a published book, adventure or other paid product.';

export default function UploadRightsConfirmation({ checked = false, onChange, disabled = false, className = '' }) {
  const id = useId();
  return (
    <div className={`rqk-upload-rights ${className}`.trim()} data-testid="upload-rights-confirmation">
      <p className="rqk-upload-rights__guide" id={`${id}-guide`}>
        Only upload your own work, or material you have permission to use. Please don&apos;t upload
        published books, adventures or other paid content: buying a book doesn&apos;t give the right
        to copy it here.
      </p>
      <label className="rqk-upload-rights__check" htmlFor={`${id}-box`}>
        <input
          id={`${id}-box`}
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          aria-describedby={`${id}-guide`}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span>{UPLOAD_RIGHTS_STATEMENT}</span>
      </label>
    </div>
  );
}
