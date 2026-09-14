import { Link } from 'react-router-dom';
import { exitReadOnlyDemo, isReadOnlyDemo, resetPreviewWorkspace } from './previewMode';

export default function PreviewWorkspaceControls() {
  const readOnlyDemo = isReadOnlyDemo();
  const reset = () => {
    if (window.confirm('Reset the sample campaign and characters? This clears only changes in this browser’s preview workspace.')) resetPreviewWorkspace();
  };

  return (
    <div className="rqk-preview-controls">
      <div>
        <strong>{readOnlyDemo ? 'Demo mode' : 'Preview workspace'}</strong>
        <span>{readOnlyDemo ? 'Sample data · Read-only · Nothing is saved' : 'Sample data · Changes stay in this browser'}</span>
      </div>
      <nav aria-label={readOnlyDemo ? 'Demo tools' : 'Preview tools'}>
        <Link to="/campaigns">GM pages</Link>
        <Link to="/player">Player pages</Link>
        {readOnlyDemo
          ? <button type="button" onClick={() => exitReadOnlyDemo()}>Exit demo</button>
          : <button type="button" onClick={reset}>Reset preview</button>}
      </nav>
    </div>
  );
}
