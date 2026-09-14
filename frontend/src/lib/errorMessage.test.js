import { getErrorMessage } from './errorMessage';

test('prefers a formatted API detail over a raw transport error', () => {
  expect(getErrorMessage({
    formattedDetail: 'The server is waking up. Please try again.',
    message: 'timeout of 30000ms exceeded',
  }, 'Login failed')).toBe('The server is waking up. Please try again.');
});

test('keeps normal API details authoritative when no formatted detail exists', () => {
  expect(getErrorMessage({
    response: { data: { detail: 'Incorrect username or password' } },
    message: 'Request failed with status code 401',
  }, 'Login failed')).toBe('Incorrect username or password');
});
