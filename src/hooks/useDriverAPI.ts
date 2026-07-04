import { useState } from 'react';

export function useDriverAPI() {
  const [loading, setLoading] = useState(false);

  const registerDriver = async (data: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          role: 'driver'
        })
      });
      const resData = await response.json();
      setLoading(false);
      return { success: resData.status === 'success', message: resData.message || '' };
    } catch (error: any) {
      setLoading(false);
      return { success: false, message: error.message || 'Network error' };
    }
  };

  const uploadDocuments = async (formData: FormData) => {
    setLoading(true);
    try {
      // Mock doc upload to database or backend files endpoint
      const response = await fetch('/api/v1/users/upload-docs', {
        method: 'POST',
        body: formData
      });
      const resData = await response.json();
      setLoading(false);
      return { success: response.ok, message: resData.message || '' };
    } catch (error: any) {
      setLoading(false);
      return { success: false, message: error.message || 'Network error' };
    }
  };

  return {
    registerDriver,
    uploadDocuments,
    loading
  };
}
