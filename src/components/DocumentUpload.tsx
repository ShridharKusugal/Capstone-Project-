import React from 'react';
import { useFormContext } from 'react-hook-form';

export default function DocumentUpload() {
  const { register } = useFormContext();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Upload Documents</h3>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Profile Photo</label>
        <input type="file" {...register('profilePhoto')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Aadhaar Card Front</label>
        <input type="file" {...register('aadhaarFront')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Aadhaar Card Back</label>
        <input type="file" {...register('aadhaarBack')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Driving License Front</label>
        <input type="file" {...register('drivingLicenseFront')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Driving License Back</label>
        <input type="file" {...register('drivingLicenseBack')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Vehicle RC</label>
        <input type="file" {...register('vehicleRC')} className="w-full text-xs" />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Vehicle Insurance</label>
        <input type="file" {...register('vehicleInsurance')} className="w-full text-xs" />
      </div>
    </div>
  );
}
