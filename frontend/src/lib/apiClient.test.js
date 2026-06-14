import { formatApiErrorDetail } from './apiErrors';

describe('formatApiErrorDetail', () => {
  it('formats FastAPI validation objects into strings', () => {
    expect(formatApiErrorDetail({ type: 'missing', loc: ['body', 'username'], msg: 'Field required', input: {} }))
      .toBe('username: Field required');
  });

  it('joins arrays of validation objects into a safe string', () => {
    expect(formatApiErrorDetail([
      { loc: ['body', 'name'], msg: 'Field required' },
      { loc: ['body', 'level'], msg: 'Input should be greater than 0' },
    ])).toBe('name: Field required · level: Input should be greater than 0');
  });
});
