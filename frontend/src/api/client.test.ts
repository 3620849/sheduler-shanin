import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './client';
import { AxiosError, AxiosResponse } from 'axios';

describe('extractErrorMessage', () => {
  it('extracts message from structured ApiError response', () => {
    const error = new AxiosError('Bad Request');
    error.response = {
      data: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Parameter message is required',
        },
      },
      status: 400,
    } as AxiosResponse;

    const result = extractErrorMessage(error);
    expect(result).toBe('Parameter message is required');
  });

  it('extracts top-level string message from axios error response', () => {
    const error = new AxiosError('Server Error');
    error.response = {
      data: {
        message: 'Internal server error occurred',
      },
      status: 500,
    } as AxiosResponse;

    const result = extractErrorMessage(error);
    expect(result).toBe('Internal server error occurred');
  });

  it('falls back to axios error message if response has no structured error message', () => {
    const error = new AxiosError('Network timeout');
    const result = extractErrorMessage(error);
    expect(result).toBe('Network timeout');
  });

  it('extracts message from standard Error object', () => {
    const error = new Error('Custom runtime error');
    const result = extractErrorMessage(error);
    expect(result).toBe('Custom runtime error');
  });

  it('returns generic message for non-error objects', () => {
    const result = extractErrorMessage('some random string');
    expect(result).toBe('An unexpected error occurred');
  });
});
