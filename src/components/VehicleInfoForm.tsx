import React from 'react';
import { useFormContext } from 'react-hook-form';

export default function VehicleInfoForm() {
  const { register } = useFormContext();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Vehicle Info</h3>
      <select {...register('vehicleType')} className="w-full border rounded px-2 py-1 text-xs">
        <option value="">Select Vehicle Type</option>
        <option value="economy">Economy (Mini/Sedan)</option>
        <option value="comfort">Comfort (Premium Sedan/SUV)</option>
        <option value="lux">Lux (Luxury Sedan)</option>
      </select>
      <input {...register('brand')} placeholder="Brand (e.g. Maruti Suzuki, Toyota)" className="w-full border rounded px-2 py-1 text-xs" />
      <input {...register('model')} placeholder="Model (e.g. Swift, Fortuner)" className="w-full border rounded px-2 py-1 text-xs" />
      <input {...register('color')} placeholder="Color" className="w-full border rounded px-2 py-1 text-xs" />
      <input type="number" {...register('manufacturingYear')} placeholder="Manufacturing Year" className="w-full border rounded px-2 py-1 text-xs" />
      <input {...register('registrationNumber')} placeholder="Registration Plate (e.g. MH-12-TX-8832)" className="w-full border rounded px-2 py-1 text-xs" />
      <input type="number" {...register('seatingCapacity')} placeholder="Seating Capacity" className="w-full border rounded px-2 py-1 text-xs" />
    </div>
  );
}
