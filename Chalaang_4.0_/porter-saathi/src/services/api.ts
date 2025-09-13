// src/services/api.ts
const API_URL = '/api';

interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: {
    error?: string;
    message?: string;
  };
}

export const callApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  try {
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_URL}/${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.message || `HTTP Error: ${response.status} ${response.statusText}`) as ApiError;
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('API Call Failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
};

export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    
    // If we have a server error response with a message, use it
    if (apiError.data?.message) {
      return apiError.data.message;
    }
    
    // Check if it's an API error with status code
    if (typeof apiError.status === 'number') {
      if (apiError.status === 404) {
        return 'The requested resource was not found.';
      }
      if (apiError.status === 401) {
        return 'Please log in to continue.';
      }
      if (apiError.status === 403) {
        return 'You do not have permission to perform this action.';
      }
      if (apiError.status === 503) {
        return 'The AI service is temporarily unavailable. Please try again in a moment.';
      }
      if (apiError.status >= 500) {
        return 'The server encountered an error. Please try again later.';
      }
    }
    
    // Use the error message if available
    if (apiError.message) {
      return apiError.message;
    }
  }
  
  // Default error message
  return 'An unexpected error occurred. Please try again.';
};