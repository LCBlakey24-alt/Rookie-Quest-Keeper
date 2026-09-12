import { Link } from 'react-router-dom';
import { resetPreviewWorkspace } from './previewMode';

export default function PreviewWorkspaceControls() {
  const reset = () => {
    if (window.confirm('Reset the sample campaign and characters? This clears only changes in this browser’s preview workspace.')) resetPreviewWorkspace();
  };
  return (
    <div className="rqk-preview-controls">
      <div><strong>Preview workspace</strong><span>Sample data · Changes stay in this browser</span></div>
      <nav aria-label="Preview tools">
        <Link to="/campaigns">GM pages</Link>
        <Link to="/player">Player pages</Link>
        <button type="button" onClick={reset}>Reset preview</button>
      </nav>
    </div>
  );
}
