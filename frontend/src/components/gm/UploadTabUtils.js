export const buildTextHandoutPayload = ({ title, content }) => {
  const trimmedTitle = String(title || '').trim();

  return {
    title: trimmedTitle,
    content: String(content || '').trim(),
    category: 'lore',
    attachment_type: 'text/plain',
    attachment_name: `${trimmedTitle}.txt`,
  };
};
