// src/components/DriverRegister.tsx
import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { driverPersonalInfoSchema, vehicleInfoSchema, documentUploadSchema } from '../utils/validationSchemas';
import { useDriverAPI } from '../hooks/useDriverAPI';
import DocumentUpload from './DocumentUpload';
import VehicleInfoForm from './VehicleInfoForm';

export type DriverRegistrationForm = {
  // Personal Info
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  // Vehicle Info
  vehicleType: string;
  brand: string;
  model: string;
  color: string;
  manufacturingYear: number;
  registrationNumber: string;
  seatingCapacity: number;
  // Documents
  profilePhoto: File;
  aadhaarFront: File;
  aadhaarBack: File;
  drivingLicenseFront: File;
  drivingLicenseBack: File;
  vehicleRC: File;
  vehicleInsurance: File;
  vehiclePUC: File;
  selfieVerification: File;
};

const steps = ['Personal Info', 'Documents', 'Vehicle Details', 'Location', 'Review'];

const DriverRegister: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const methods = useForm<any>({
    resolver: yupResolver(
      (activeStep === 0 ? driverPersonalInfoSchema : activeStep === 2 ? vehicleInfoSchema : documentUploadSchema) as any
    ),
    mode: 'onBlur',
  });

  const { handleSubmit, trigger } = methods;
  const { registerDriver, uploadDocuments } = useDriverAPI();

  const onNext = async (data: any) => {
    const valid = await trigger();
    if (!valid) return;
    if (activeStep === steps.length - 1) {
      // submit registration
      const { profilePhoto, ...docFiles } = data;
      const registerResp = await registerDriver(data);
      if (registerResp.success) {
        const formData = new FormData();
        Object.entries(docFiles).forEach(([k, v]) => formData.append(k, v as File));
        await uploadDocuments(formData);
        alert('Registration successful!');
      } else {
        alert('Registration failed: ' + registerResp.message);
      }
    } else {
      setActiveStep((s) => s + 1);
    }
  };

  const onBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-center">Driver Registration</h2>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onNext)}>
          {activeStep === 0 && (
            <div className="space-y-3">
              <input {...methods.register('fullName')} placeholder="Full Name" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('mobileNumber')} placeholder="Mobile Number" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('email')} placeholder="Email" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('password')} type="password" placeholder="Password" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('confirmPassword')} type="password" placeholder="Confirm Password" className="w-full border rounded px-2 py-1" />
              <select {...methods.register('gender')} className="w-full border rounded px-2 py-1">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input {...methods.register('dateOfBirth')} type="date" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('address')} placeholder="Address" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('city')} placeholder="City" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('state')} placeholder="State" className="w-full border rounded px-2 py-1" />
              <input {...methods.register('pinCode')} placeholder="PIN Code" className="w-full border rounded px-2 py-1" />
            </div>
          )}
          {activeStep === 1 && <DocumentUpload />}
          {activeStep === 2 && <VehicleInfoForm />}
          {activeStep === 3 && (
            <div className="text-center py-8">
              <p className="mb-4">Location permission will be requested on the next step.</p>
            </div>
          )}
          {activeStep === 4 && (
            <div className="text-center py-8"><p className="mb-2 font-medium">Review and submit.</p></div>
          )}
          <div className="flex justify-between mt-6">
            {activeStep > 0 && (
              <button type="button" onClick={onBack} className="px-4 py-2 bg-gray-300 rounded">
                Back
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">
              {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default DriverRegister;
