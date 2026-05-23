import ImageUploadPanel from '@/components/ImageUploadPanel';

/**
 * Deprecated upload-only compatibility wrapper.
 *
 * Rookie Quest Keeper no longer supports AI image generation.
 * This component exists only so older, not-yet-refactored screens do not break
 * while they are migrated to ImageUploadPanel. It deliberately ignores legacy
 * generation props such as buttonLabel/payload so no image-generation wording or
 * behaviour can leak into the UI.
 */
export default function AIImageGeneratorPanel(props) {
  const title = String(props.title || 'Upload Image')
    .replace(/AI\s*/gi, '')
    .replace(/Generated\s*/gi, '')
    .replace(/Generate\s*/gi, '')
    .replace(/Generation\s*/gi, '')
    .replace(/Image$/gi, 'Image Upload')
    .replace(/Artwork$/gi, 'Artwork Upload')
    .trim() || 'Upload Image';

  const { buttonLabel, payload, ...uploadProps } = props;

  return (
    <ImageUploadPanel
      {...uploadProps}
      title={title}
      subtitle="Upload your own image. AI image generation is not available in Rookie Quest Keeper."
      uploadLabel={props.uploadLabel || 'Upload image'}
    />
  );
}
